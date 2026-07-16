"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Activity } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function Header() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.balances.latest.queryOptions());

  // Find the most recent fetchedAt across all platforms
  const lastUpdated = data?.reduce<Date | null>((latest, item) => {
    if (!item.snapshot?.fetchedAt) return latest;
    const dt = new Date(item.snapshot.fetchedAt);
    return !latest || dt > latest ? dt : latest;
  }, null);

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6">
      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-600" />
        <span className="font-bold">Ad Balance</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3 text-sm text-slate-500">
        {lastUpdated && (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Обновлено:{" "}
            {format(lastUpdated, "HH:mm", { locale: ru })}
          </span>
        )}
      </div>
    </header>
  );
}
