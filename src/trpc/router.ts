import { router } from "./init";
import { balancesRouter } from "@/server/routers/balances";
import { alertsRouter } from "@/server/routers/alerts";
import { settingsRouter } from "@/server/routers/settings";

export const appRouter = router({
  balances: balancesRouter,
  alerts: alertsRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
