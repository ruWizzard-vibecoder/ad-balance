"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AccountCard } from "@/components/dashboard/AccountCard";
import { OverviewChart } from "@/components/dashboard/OverviewChart";

export default function DashboardPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.balances.latest.queryOptions());

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Мониторинг баланса
        </h1>
      </div>

      {/* Account cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-5 h-40 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-20 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-32 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : !data?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <p>Нет аккаунтов</p>
          <p className="text-xs mt-1">Добавьте аккаунты в настройках</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <AccountCard
              key={item.account.id}
              accountId={item.account.id}
              accountName={item.account.name}
              platformSlug={item.platform.slug}
              platformName={item.platform.name}
              snapshot={item.snapshot}
            />
          ))}
        </div>
      )}

      {/* Overview chart */}
      <OverviewChart />
    </div>
  );
}
