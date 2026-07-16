import { type PlatformClient, type PlatformFetchResult, platformFetch } from "./types";

export const vkAdsClient: PlatformClient = {
  async fetch(credentials, cachedToken): Promise<PlatformFetchResult> {
    // Use cached token > stored access_token > refresh flow > client_credentials
    let accessToken = cachedToken || credentials.access_token || null;
    let newToken: PlatformFetchResult["newToken"] = undefined;

    // Try existing token first
    if (accessToken) {
      const valid = await testToken(accessToken);
      if (!valid) {
        accessToken = null;
      }
    }

    // If no valid token, try refresh_token flow
    if (!accessToken && credentials.refresh_token) {
      try {
        const refreshed = await refreshToken(credentials);
        accessToken = refreshed.access_token;
        newToken = {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000)
            : undefined,
        };
      } catch (err) {
        console.warn("[VK Ads] Refresh token failed:", err);
      }
    }

    // Last resort: client_credentials
    if (!accessToken && credentials.client_id && credentials.client_secret) {
      const tokenData = await getToken(credentials);
      accessToken = tokenData.access_token;
      newToken = {
        accessToken: tokenData.access_token,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
      };
    }

    if (!accessToken) {
      throw new Error("VK Ads: no valid authentication method available");
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // Step 1: Get budget (direct balance endpoint)
    let balance = 0;
    try {
      const budgetRes = await platformFetch(
        "https://ads.vk.com/api/v2/budget.json",
        { headers }
      );
      const budgetData = (await budgetRes.json()) as Record<string, unknown>;
      if (typeof budgetData.balance === "number") {
        balance = budgetData.balance;
      } else if (typeof budgetData.balance === "string") {
        balance = parseFloat(budgetData.balance);
      }
    } catch (err) {
      console.warn("[VK Ads] Budget endpoint error:", err);
    }

    // Step 2: Get account info for stats
    let accountId = credentials.account_id || "";
    try {
      const userRes = await platformFetch(
        "https://ads.vk.com/api/v3/user.json",
        { headers }
      );
      const userData = (await userRes.json()) as Record<string, unknown>;
      accountId = String(userData.id || accountId);
    } catch {
      // Use credentials account_id
    }

    // Step 3: Get weekly spend stats
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const statsParams = new URLSearchParams({
      date_from: weekAgo.toISOString().slice(0, 10),
      date_to: now.toISOString().slice(0, 10),
      id: accountId,
      metrics: "base",
    });

    const dailySpendData: { date: string; spend: number }[] = [];
    try {
      const statsRes = await platformFetch(
        `https://ads.vk.com/api/v2/statistics/users/day.json?${statsParams}`,
        { headers }
      );
      const statsData = (await statsRes.json()) as {
        items?: { rows?: { date: string; base?: { spent?: string } }[] }[];
      };

      if (statsData.items?.[0]?.rows) {
        for (const row of statsData.items[0].rows) {
          dailySpendData.push({
            date: row.date,
            spend: parseFloat(row.base?.spent || "0"),
          });
        }
      }
    } catch (err) {
      console.warn("[VK Ads] Stats error:", err);
    }

    // Step 4: If budget endpoint returned 0, fallback to transactions
    let totalDeposits: number | undefined;
    let totalCharges: number | undefined;

    if (balance === 0 && accountId) {
      try {
        const txParams = new URLSearchParams({
          account_id: accountId,
          limit: "200",
          offset: "0",
        });

        const txRes = await platformFetch(
          `https://ads.vk.com/api/v2/billing/transaction_groups.json?${txParams}`,
          { headers }
        );
        const txData = (await txRes.json()) as {
          items?: { type: string; amount: string }[];
        };

        totalDeposits = 0;
        totalCharges = 0;
        if (txData.items) {
          for (const item of txData.items) {
            const amount = parseFloat(item.amount);
            if (item.type === "deposit") totalDeposits += amount;
            else if (item.type === "charge") totalCharges += amount;
          }
        }
        balance = totalDeposits - totalCharges;
      } catch (err) {
        console.warn("[VK Ads] Transactions error:", err);
      }
    }

    return {
      balance,
      currency: "RUB",
      totalDeposits,
      totalCharges,
      dailySpendData,
      newToken,
    };
  },
};

async function testToken(token: string): Promise<boolean> {
  try {
    const res = await platformFetch("https://ads.vk.com/api/v3/user.json", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    return !data.error;
  } catch {
    return false;
  }
}

async function refreshToken(
  credentials: Record<string, string>
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await platformFetch("https://ads.vk.com/api/v2/oauth2/token.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!data.access_token) {
    throw new Error(`VK refresh error: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function getToken(
  credentials: Record<string, string>
): Promise<{ access_token: string; expires_in?: number }> {
  const res = await platformFetch("https://ads.vk.com/api/v2/oauth2/token.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!data.access_token) {
    throw new Error(`VK token error: ${JSON.stringify(data)}`);
  }
  return data as { access_token: string; expires_in?: number };
}
