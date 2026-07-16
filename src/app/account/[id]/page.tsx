"use client";

import { use, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { PLATFORM_CONFIG, type PlatformSlug } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { ForecastBadge } from "@/components/dashboard/ForecastBadge";
import { SpendChart } from "@/components/charts/SpendChart";
import { BalanceChart } from "@/components/charts/BalanceChart";
import { CampaignBreakdown } from "@/components/charts/CampaignBreakdown";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: accountId } = use(params);
  const [days, setDays] = useState(30);
  const trpc = useTRPC();

  const { data: latest } = useQuery(trpc.balances.latest.queryOptions());
  const { data: history } = useQuery(
    trpc.balances.history.queryOptions({ accountId, days })
  );
  const { data: campaigns } = useQuery(
    trpc.balances.campaignSpend.queryOptions({ accountId, days })
  );

  const accountData = latest?.find((p) => p.account.id === accountId);
  const slug = accountData?.platform.slug as PlatformSlug | undefined;
  const config = slug ? PLATFORM_CONFIG[slug] : undefined;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config?.color || "#6b7280" }}
          />
          <h1 className="text-2xl font-bold text-slate-900">
            {accountData?.account.name || accountId}
          </h1>
        </div>
      </div>

      {/* Stats cards */}
      {accountData?.snapshot && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Баланс"
            value={formatCurrency(
              accountData.snapshot.balance,
              accountData.snapshot.currency
            )}
          />
          <StatCard
            label="Расход/день"
            value={
              accountData.snapshot.dailySpend !== null
                ? formatCurrency(
                    accountData.snapshot.dailySpend,
                    accountData.snapshot.currency
                  )
                : "—"
            }
          />
          <StatCard
            label="Прогноз"
            value={
              <ForecastBadge
                daysRemaining={accountData.snapshot.daysRemaining}
              />
            }
          />
          <StatCard
            label="Обновлено"
            value={new Date(
              accountData.snapshot.fetchedAt
            ).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </div>
      )}

      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {d} дн.
          </button>
        ))}
      </div>

      {/* Balance history chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          История баланса
        </h2>
        <BalanceChart
          data={history || []}
          color={config?.color || "#3b82f6"}
          currency={config?.currency || "USD"}
        />
      </div>

      {/* Daily spend chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Дневные расходы
        </h2>
        <SpendChart
          data={history || []}
          color={config?.color || "#3b82f6"}
          currency={config?.currency || "USD"}
        />
      </div>

      {/* Campaign breakdown */}
      {campaigns && campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Расходы по кампаниям
          </h2>
          <CampaignBreakdown campaigns={campaigns} />

          {/* Campaign table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">
                    Кампания
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">
                    Приложение
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {c.appName || "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          c.isActive ? "bg-green-500" : "bg-slate-300"
                        }`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
