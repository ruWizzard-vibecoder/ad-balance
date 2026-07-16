import { db } from "@/server/db";
import { vkAdsClient } from "./platforms/vk-ads";
import { unityAdsClient } from "./platforms/unity-ads";
import { mintegralClient } from "./platforms/mintegral";
import { calculateForecast } from "./forecast";
import { sendSlackAlert } from "./slack";
import type { PlatformClient } from "./platforms/types";

const clients: Record<string, PlatformClient> = {
  "vk-ads": vkAdsClient,
  "unity-ads": unityAdsClient,
  mintegral: mintegralClient,
};

export async function fetchAllPlatforms() {
  const accounts = await db.account.findMany({
    where: { enabled: true, platform: { enabled: true } },
    include: { platform: true },
  });

  const settings = await db.settings.findUnique({ where: { id: "default" } });
  const thresholds = {
    critical: settings?.criticalThreshold ?? 1,
    warning: settings?.warningThreshold ?? 2,
    caution: settings?.cautionThreshold ?? 5,
  };

  const results: { account: string; platform: string; ok: boolean; error?: string }[] = [];

  for (const account of accounts) {
    try {
      const client = clients[account.platform.slug];
      if (!client) {
        results.push({ account: account.name, platform: account.platform.slug, ok: false, error: "Unknown platform" });
        continue;
      }

      const creds = account.credentials as Record<string, string>;

      // Check if any credential values are empty
      const hasEmptyCreds = Object.values(creds).some((v) => !v);
      if (hasEmptyCreds) {
        results.push({ account: account.name, platform: account.platform.slug, ok: false, error: "Credentials not configured" });
        continue;
      }

      const cachedToken = account.tokenExpiry &&
        account.tokenExpiry > new Date()
        ? account.accessToken
        : null;

      console.log(`[Fetcher] Fetching ${account.name}...`);
      const data = await client.fetch(creds, cachedToken);

      // Persist refreshed token if client returned one
      if (data.newToken) {
        const updateData: Record<string, unknown> = {
          accessToken: data.newToken.accessToken,
        };
        if (data.newToken.expiresAt) {
          updateData.tokenExpiry = data.newToken.expiresAt;
        }
        if (data.newToken.refreshToken) {
          const updatedCreds = { ...creds, refresh_token: data.newToken.refreshToken };
          updateData.credentials = updatedCreds;
        }
        await db.account.update({
          where: { id: account.id },
          data: updateData,
        });
      }

      // Calculate forecast
      const { dailySpend, daysRemaining } = calculateForecast(
        data.balance,
        data.dailySpendData
      );

      // Save balance snapshot
      await db.balanceSnapshot.create({
        data: {
          accountId: account.id,
          balance: data.balance,
          currency: data.currency,
          dailySpend,
          daysRemaining,
          totalDeposits: data.totalDeposits,
          totalCharges: data.totalCharges,
        },
      });

      // Save campaign data
      if (data.campaigns) {
        for (const camp of data.campaigns) {
          const dbCampaign = await db.campaign.upsert({
            where: {
              accountId_externalId: {
                accountId: account.id,
                externalId: camp.externalId,
              },
            },
            update: {
              name: camp.name,
              appName: camp.appName,
              isActive: camp.isActive,
            },
            create: {
              accountId: account.id,
              externalId: camp.externalId,
              name: camp.name,
              appName: camp.appName,
              isActive: camp.isActive,
            },
          });

          for (const ds of camp.dailySpend) {
            await db.campaignSpend.upsert({
              where: {
                campaignId_date: {
                  campaignId: dbCampaign.id,
                  date: new Date(ds.date),
                },
              },
              update: { spend: ds.spend },
              create: {
                campaignId: dbCampaign.id,
                date: new Date(ds.date),
                spend: ds.spend,
              },
            });
          }
        }
      }

      // Check alerts
      if (daysRemaining !== null) {
        let level: string | null = null;
        if (daysRemaining <= thresholds.critical) level = "critical";
        else if (daysRemaining <= thresholds.warning) level = "warning";
        else if (daysRemaining <= thresholds.caution) level = "caution";

        if (level) {
          const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
          const recentAlert = await db.alert.findFirst({
            where: {
              accountId: account.id,
              level,
              createdAt: { gte: fourHoursAgo },
            },
          });

          if (!recentAlert) {
            const message = `${account.name}: баланс ${data.balance.toFixed(2)} ${data.currency}, осталось ~${daysRemaining} дн.`;

            let slackSent = false;
            let slackError: string | undefined;

            if (settings?.slackWebhookUrl) {
              const slackResult = await sendSlackAlert({
                webhookUrl: settings.slackWebhookUrl,
                platformName: account.name,
                level,
                balance: data.balance,
                currency: data.currency,
                dailySpend,
                daysRemaining,
              });
              slackSent = slackResult.ok;
              slackError = slackResult.error;
            }

            await db.alert.create({
              data: {
                accountId: account.id,
                level,
                daysRemaining,
                balance: data.balance,
                dailySpend,
                message,
                slackSent,
                slackError,
              },
            });
          }
        }
      }

      results.push({ account: account.name, platform: account.platform.slug, ok: true });
      console.log(
        `[Fetcher] ${account.name}: balance=${data.balance.toFixed(2)} ${data.currency}, dailySpend=${dailySpend.toFixed(2)}, daysLeft=${daysRemaining ?? "N/A"}`
      );
    } catch (err) {
      console.error(`[Fetcher] ${account.name} error:`, err);
      results.push({ account: account.name, platform: account.platform.slug, ok: false, error: String(err) });
    }
  }

  return results;
}
