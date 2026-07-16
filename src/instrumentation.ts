export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
      try {
        const { fetchAllPlatforms } = await import("@/server/lib/fetcher");
        const results = await fetchAllPlatforms();
        console.log("[Cron/Fetcher] Results:", results);
      } catch (err) {
        console.error("[Cron/Fetcher] Error:", err);
      }
    }, INTERVAL);

    // Initial fetch on startup (5s delay to let DB connect)
    setTimeout(async () => {
      try {
        const { fetchAllPlatforms } = await import("@/server/lib/fetcher");
        const results = await fetchAllPlatforms();
        console.log("[Cron/Fetcher] Initial fetch:", results);
      } catch (err) {
        console.error("[Cron/Fetcher] Initial fetch error:", err);
      }
    }, 5000);

    console.log("[Cron] Ad balance fetcher started (every 10 min)");
  }
}
