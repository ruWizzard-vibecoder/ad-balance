import { createHash } from "crypto";
import { type PlatformClient, type PlatformFetchResult, platformFetch } from "./types";

export const mintegralClient: PlatformClient = {
  async fetch(credentials): Promise<PlatformFetchResult> {
    // Generate auth token: MD5(api_key + MD5(timestamp))
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const md5Timestamp = md5(timestamp);
    const token = md5(credentials.api_key + md5Timestamp);

    const authHeaders: Record<string, string> = {
      "access-key": credentials.access_key,
      token,
      timestamp,
    };

    // Step 1: Get account balance
    let balance = 0;
    let currency = "USD";
    try {
      const balanceRes = await platformFetch(
        "https://ss-api.mintegral.com/api/open/v1/account/balance",
        { headers: authHeaders }
      );
      const balanceData = await balanceRes.json() as {
        code: number;
        data?: { list?: { balance: number; currency: string }[] };
      };

      if (balanceData.code === 200 && balanceData.data?.list?.[0]) {
        balance = balanceData.data.list[0].balance;
        currency = balanceData.data.list[0].currency || "USD";
      }
    } catch (err) {
      console.error("[Mintegral] Balance error:", err);
    }

    // Step 2: Get spend reports (advertiser, last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startTime = weekAgo.toISOString().slice(0, 10);
    const endTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const dailySpendData: { date: string; spend: number }[] = [];

    try {
      // Step 2a: Request report generation (type=1)
      const genParams = new URLSearchParams({
        start_time: startTime,
        end_time: endTime,
        type: "1",
        dimension_option: "Offer",
        timezone: "+8",
      });

      let reportReady = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const genRes = await platformFetch(
          `https://ss-api.mintegral.com/api/v2/reports/data?${genParams}`,
          { headers: authHeaders }
        );
        const genData = await genRes.json() as { code: number };

        if (genData.code === 200) {
          reportReady = true;
          break;
        } else if (genData.code === 201 || genData.code === 202) {
          // Still generating, wait and retry
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          console.error("[Mintegral] Report gen error:", genData);
          break;
        }
      }

      if (reportReady) {
        // Step 2b: Download report (type=2)
        const dlParams = new URLSearchParams({
          start_time: startTime,
          end_time: endTime,
          type: "2",
          dimension_option: "Offer",
          timezone: "+8",
        });

        const dlRes = await platformFetch(
          `https://ss-api.mintegral.com/api/v2/reports/data?${dlParams}`,
          { headers: authHeaders }
        );

        // Response is tab-separated text (ODS/TSV)
        const reportText = await dlRes.text();
        const lines = reportText.trim().split("\n");

        if (lines.length > 1) {
          const header = lines[0].split("\t");
          const dateIdx = header.findIndex((h) => h.trim() === "Date");
          const spendIdx = header.findIndex((h) => h.trim() === "Spend");

          if (dateIdx >= 0 && spendIdx >= 0) {
            const dailyTotals: Record<string, number> = {};

            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split("\t");
              const date = cols[dateIdx]?.trim();
              const spend = parseFloat(cols[spendIdx]?.trim()) || 0;
              if (date) {
                dailyTotals[date] = (dailyTotals[date] || 0) + spend;
              }
            }

            for (const [date, spend] of Object.entries(dailyTotals)) {
              dailySpendData.push({ date, spend });
            }
            dailySpendData.sort((a, b) => a.date.localeCompare(b.date));
          }
        }
      }
    } catch (err) {
      console.error("[Mintegral] Reports error:", err);
    }

    return {
      balance,
      currency,
      dailySpendData,
    };
  },
};

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}
