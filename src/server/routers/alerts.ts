import { z } from "zod";
import { router, baseProcedure } from "@/trpc/init";
import { db } from "@/server/db";

export const alertsRouter = router({
  list: baseProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        slug: z.string().optional(),
        level: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};

      if (input.accountId) {
        where.accountId = input.accountId;
      } else if (input.slug) {
        // Filter by platform slug (all accounts of that platform)
        const accounts = await db.account.findMany({
          where: { platform: { slug: input.slug } },
          select: { id: true },
        });
        where.accountId = { in: accounts.map((a) => a.id) };
      }

      if (input.level) {
        where.level = input.level;
      }

      const alerts = await db.alert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              platform: { select: { slug: true, name: true } },
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (alerts.length > input.limit) {
        const last = alerts.pop()!;
        nextCursor = last.id;
      }

      return {
        items: alerts.map((a) => ({
          id: a.id,
          accountId: a.account.id,
          accountName: a.account.name,
          platformSlug: a.account.platform.slug,
          platformName: a.account.platform.name,
          level: a.level,
          daysRemaining: a.daysRemaining,
          balance: a.balance,
          dailySpend: a.dailySpend,
          message: a.message,
          slackSent: a.slackSent,
          slackError: a.slackError,
          createdAt: a.createdAt,
        })),
        nextCursor,
      };
    }),

  stats: baseProcedure.query(async () => {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [count24h, count7d, total] = await Promise.all([
      db.alert.count({ where: { createdAt: { gte: last24h } } }),
      db.alert.count({ where: { createdAt: { gte: last7d } } }),
      db.alert.count(),
    ]);

    return { count24h, count7d, total };
  }),
});
