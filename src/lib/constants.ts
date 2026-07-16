export const PLATFORM_SLUGS = ["vk-ads", "unity-ads", "mintegral"] as const;
export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

export const PLATFORM_CONFIG: Record<
  PlatformSlug,
  { name: string; color: string; currency: string; icon: string }
> = {
  "vk-ads": {
    name: "VK Ads",
    color: "#0077FF",
    currency: "RUB",
    icon: "vk",
  },
  "unity-ads": {
    name: "Unity Ads",
    color: "#222222",
    currency: "USD",
    icon: "unity",
  },
  mintegral: {
    name: "Mintegral",
    color: "#FF6B35",
    currency: "USD",
    icon: "mintegral",
  },
};

export const DEFAULT_THRESHOLDS = {
  critical: 1,
  warning: 2,
  caution: 5,
};

export const FETCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
