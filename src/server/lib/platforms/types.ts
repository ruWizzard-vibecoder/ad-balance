export interface DailySpend {
  date: string; // YYYY-MM-DD
  spend: number;
}

export interface CampaignData {
  externalId: string;
  name: string;
  appName?: string;
  isActive: boolean;
  dailySpend: DailySpend[];
  remainingBudget?: number;
}

export interface PlatformFetchResult {
  balance: number;
  currency: string;
  totalDeposits?: number;
  totalCharges?: number;
  dailySpendData: DailySpend[];
  campaigns?: CampaignData[];
  /** If the client refreshed the token, return it here so fetcher can persist it */
  newToken?: { accessToken: string; refreshToken?: string; expiresAt?: Date };
}

export interface PlatformClient {
  fetch(credentials: Record<string, string>, cachedToken?: string | null): Promise<PlatformFetchResult>;
}

export function getProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;

  // Dynamic import to avoid bundling issues
  return proxyUrl;
}

export async function platformFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

  if (proxyUrl) {
    const { ProxyAgent } = await import("undici");
    const agent = new ProxyAgent(proxyUrl);
    return fetch(url, {
      ...options,
      // @ts-expect-error Node.js fetch supports dispatcher
      dispatcher: agent,
    });
  }

  return fetch(url, options);
}
