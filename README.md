# Ad Balance Monitor

Real-time dashboard for monitoring advertising account balances across **VK Ads**, **Unity Ads**, and **Mintegral**. Tracks balances and daily spend, forecasts days-to-depletion, and sends threshold alerts to Slack. Replaces a fragile n8n workflow with a dedicated, typed, self-hosted GUI.

## Features

- **Unified balance view** — three ad platforms with different auth schemes behind one `PlatformClient` interface
- **Spend forecasting** — daily spend aggregation and days-remaining projection per account
- **Threshold alerts** — critical/warning/caution levels with Slack webhook delivery and 4-hour deduplication
- **Balance history** — snapshot timeline with charts (Recharts), per-campaign spend breakdown
- **Credential management** — tokens stored in DB, masked in API responses, VK OAuth refresh chain handled automatically

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16, React 19, Tailwind CSS v4 |
| API | tRPC v11 (zod-validated procedures) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Charts | Recharts |
| Scheduling | `instrumentation.ts` in-process scheduler (10-min cycle) |

## Architecture

```
instrumentation.ts        — scheduler (every 10 min)
 └─ server/lib/fetcher.ts — orchestrator: per-account isolation, upserts, alerting
     ├─ platforms/vk-ads.ts     — Bearer + OAuth refresh chain, RUB
     ├─ platforms/unity-ads.ts  — Basic auth, per-campaign budget aggregation, USD
     └─ platforms/mintegral.ts  — MD5-signed headers, report generate/poll/download
tRPC routers: balances / alerts / settings
Pages: dashboard, platform detail, alert history, settings
```

Key patterns:

- **Idempotent writes** — `upsert` on natural keys (`campaignId+date`, `platformId+externalId`); balance snapshots are append-only
- **Failure isolation** — one platform/account failing never aborts the fetch cycle
- **Token persistence** — clients return refreshed tokens, orchestrator saves them back to DB

## Getting Started

```bash
npm install
npx prisma db push && npx prisma db seed
npm run dev            # http://localhost:3000
```

Environment (`.env`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `HTTPS_PROXY` | optional egress proxy for platform APIs |

Platform credentials are entered through the Settings page and stored in the database (masked on read).

## Production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Multi-stage Dockerfile (non-root user, healthcheck, `read_only` rootfs). The app is designed to run inside a private network (VPN/Tailscale) — it intentionally has no user auth layer.
