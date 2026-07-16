import { type PlatformClient, type PlatformFetchResult, type CampaignData, platformFetch } from "./types";

export const unityAdsClient: PlatformClient = {
  async fetch(credentials): Promise<PlatformFetchResult> {
    const orgId = credentials.organization_id;
    if (!orgId) throw new Error("Unity Ads: organization_id is required");

    const headers = {
      Authorization: `Basic ${btoa(`${credentials.key_id}:${credentials.secret_key}`)}`,
      Accept: "application/json",
    };

    // Step 2: Get apps
    const appsRes = await platformFetch(
      `https://services.api.unity.com/advertise/v1/organizations/${orgId}/apps`,
      { headers }
    );
    const appsData = await appsRes.json();
    const apps = appsData.results || [];

    const campaigns: CampaignData[] = [];
    const allDailySpend: Record<string, number> = {};

    // Step 3: For each app, get campaigns + spend
    for (const app of apps) {
      // Get campaigns
      const campRes = await platformFetch(
        `https://services.api.unity.com/advertise/v1/organizations/${orgId}/apps/${app.id}/campaigns`,
        { headers }
      );
      const campData = await campRes.json();
      const appCampaigns = campData.results || [];

      for (const camp of appCampaigns) {
        // Get budget: response has {total, spent, dailySpent, daily}
        let remainingBudget: number | undefined;
        try {
          const budgetRes = await platformFetch(
            `https://services.api.unity.com/advertise/v1/organizations/${orgId}/apps/${app.id}/campaigns/${camp.id}/budget`,
            { headers }
          );
          const budgetData = await budgetRes.json() as {
            total?: string; spent?: string; dailySpent?: string; daily?: string;
          };
          const total = parseFloat(budgetData.total || "0");
          const spent = parseFloat(budgetData.spent || "0");
          if (total > 0) {
            remainingBudget = total - spent;
          }
        } catch {
          // Budget endpoint may fail for some campaigns
        }

        // Get spend stats (7 days)
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const statsParams = new URLSearchParams({
          start: weekAgo.toISOString().slice(0, 10),
          end: now.toISOString().slice(0, 10),
          appIds: app.id,
          metrics: "spend",
          scale: "day",
        });

        const dailySpend: { date: string; spend: number }[] = [];
        try {
          const statsRes = await platformFetch(
            `https://services.api.unity.com/advertise/stats/v2/organizations/${orgId}/reports/acquisitions?${statsParams}`,
            { headers }
          );
          const statsText = await statsRes.text();

          // Parse CSV: "timestamp,spend\n2025-01-01,12.34\n..."
          const lines = statsText.trim().split("\n").slice(1);
          for (const line of lines) {
            const [date, spendStr] = line.split(",");
            const spend = parseFloat(spendStr);
            if (!isNaN(spend)) {
              dailySpend.push({ date, spend });
              allDailySpend[date] = (allDailySpend[date] || 0) + spend;
            }
          }
        } catch {
          // Stats may not be available
        }

        campaigns.push({
          externalId: camp.id,
          name: camp.name || `Campaign ${camp.id}`,
          appName: app.name,
          isActive: camp.enabled !== false,
          dailySpend,
          remainingBudget,
        });
      }
    }

    // Calculate total balance from all campaign budgets
    const totalBalance = campaigns.reduce((sum, c) => sum + (c.remainingBudget || 0), 0);

    // Convert allDailySpend to array
    const dailySpendData = Object.entries(allDailySpend)
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      balance: totalBalance,
      currency: "USD",
      dailySpendData,
      campaigns,
    };
  },
};

