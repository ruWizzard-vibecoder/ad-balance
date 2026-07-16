import { z } from "zod";
import { router, baseProcedure } from "@/trpc/init";
import { db } from "@/server/db";

export const balancesRouter = router({
  // Latest snapshot per account
  latest: baseProcedure.query(async () => {
    const accounts = await db.account.findMany({
      where: { enabled: true, platform: { enabled: true } },
      include: { platform: true },
      orderBy: [{ platform: { slug: "asc" } }, { name: "asc" }],
    });

    const results = await Promise.all(
      accounts.map(async (acc) => {
        const snapshot = await db.balanceSnapshot.findFirst({
          where: { accountId: acc.id },
          orderBy: { fetchedAt: "desc" },
        });

        return {
          account: {
            id: acc.id,
            name: acc.name,
          },
          platform: {
            id: acc.platform.id,
            slug: acc.platform.slug,
            name: acc.platform.name,
          },
          snapshot: snapshot
            ? {
                balance: snapshot.balance,
                currency: snapshot.currency,
                dailySpend: snapshot.dailySpend,
                daysRemaining: snapshot.daysRemaining,
                totalDeposits: snapshot.totalDeposits,
                totalCharges: snapshot.totalCharges,
                fetchedAt: snapshot.fetchedAt,
              }
            : null,
        };
      })
    );

    return results;
  }),

  // Balance history for charts (by account)
  history: baseProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const snapshots = await db.balanceSnapshot.findMany({
        where: {
          accountId: input.accountId,
          fetchedAt: { gte: since },
        },
        orderBy: { fetchedAt: "asc" },
        select: {
          balance: true,
          dailySpend: true,
          daysRemaining: true,
          fetchedAt: true,
        },
      });

      return snapshots;
    }),

  // Campaign-level spend data (by account)
  campaignSpend: baseProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input }) => {
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const campaigns = await db.campaign.findMany({
        where: { accountId: input.accountId },
        include: {
          spendRecords: {
            where: { date: { gte: since } },
            orderBy: { date: "asc" },
          },
        },
      });

      return campaigns.map((c) => ({
        id: c.id,
        externalId: c.externalId,
        name: c.name,
        appName: c.appName,
        isActive: c.isActive,
        spend: c.spendRecords.map((s) => ({
          date: s.date,
          spend: s.spend,
        })),
      }));
    }),

  // Trigger manual fetch
  triggerFetch: baseProcedure.mutation(async () => {
    const { fetchAllPlatforms } = await import("@/server/lib/fetcher");
    const results = await fetchAllPlatforms();
    return results;
  }),
});
