import { z } from "zod";
import { router, baseProcedure } from "@/trpc/init";
import { db } from "@/server/db";

export const settingsRouter = router({
  get: baseProcedure.query(async () => {
    let settings = await db.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await db.settings.create({
        data: { id: "default" },
      });
    }
    return settings;
  }),

  update: baseProcedure
    .input(
      z.object({
        criticalThreshold: z.number().min(0).max(30).optional(),
        warningThreshold: z.number().min(0).max(30).optional(),
        cautionThreshold: z.number().min(0).max(90).optional(),
        slackWebhookUrl: z.string().optional().nullable(),
        fetchIntervalMin: z.number().min(1).max(60).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return db.settings.update({
        where: { id: "default" },
        data: input,
      });
    }),

  // --- Account CRUD ---

  // List all accounts (grouped by platform)
  listAccounts: baseProcedure.query(async () => {
    const platforms = await db.platform.findMany({
      orderBy: { slug: "asc" },
      include: {
        accounts: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            enabled: true,
            credentials: true,
            accessToken: true,
            tokenExpiry: true,
            createdAt: true,
          },
        },
      },
    });

    return platforms.map((p) => ({
      platform: { id: p.id, slug: p.slug, name: p.name, enabled: p.enabled },
      accounts: p.accounts.map((acc) => {
        const creds = acc.credentials as Record<string, string>;
        const masked: Record<string, string> = {};
        for (const [key, value] of Object.entries(creds)) {
          masked[key] = value ? value.slice(0, 4) + "••••" + value.slice(-4) : "";
        }
        return {
          id: acc.id,
          name: acc.name,
          enabled: acc.enabled,
          credentials: masked,
          hasToken: !!acc.accessToken,
          tokenExpiry: acc.tokenExpiry,
          createdAt: acc.createdAt,
        };
      }),
    }));
  }),

  // Create a new account
  createAccount: baseProcedure
    .input(
      z.object({
        platformSlug: z.string(),
        name: z.string().min(1),
        credentials: z.record(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const platform = await db.platform.findUnique({
        where: { slug: input.platformSlug },
      });
      if (!platform) throw new Error("Platform not found");

      const account = await db.account.create({
        data: {
          platformId: platform.id,
          name: input.name,
          credentials: input.credentials,
        },
      });

      return { id: account.id, name: account.name };
    }),

  // Update account
  updateAccount: baseProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string().min(1).optional(),
        enabled: z.boolean().optional(),
        credentials: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.enabled !== undefined) data.enabled = input.enabled;
      if (input.credentials !== undefined) {
        data.credentials = input.credentials;
        data.accessToken = null;
        data.tokenExpiry = null;
      }

      await db.account.update({
        where: { id: input.accountId },
        data,
      });

      return { ok: true };
    }),

  // Delete account and all related data
  deleteAccount: baseProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input }) => {
      // Delete in order: campaign spends → campaigns → snapshots → alerts → account
      const campaigns = await db.campaign.findMany({
        where: { accountId: input.accountId },
        select: { id: true },
      });

      if (campaigns.length > 0) {
        await db.campaignSpend.deleteMany({
          where: { campaignId: { in: campaigns.map((c) => c.id) } },
        });
        await db.campaign.deleteMany({
          where: { accountId: input.accountId },
        });
      }

      await db.balanceSnapshot.deleteMany({
        where: { accountId: input.accountId },
      });
      await db.alert.deleteMany({
        where: { accountId: input.accountId },
      });
      await db.account.delete({
        where: { id: input.accountId },
      });

      return { ok: true };
    }),

  // Test Slack webhook
  testSlack: baseProcedure
    .input(z.object({ webhookUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const res = await fetch(input.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "\u{2705} Ad Balance Monitor: тестовое сообщение успешно отправлено!",
        }),
      });

      return { ok: res.ok, status: res.status };
    }),
});
