"use client";

import Link from "next/link";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { PLATFORM_CONFIG, type PlatformSlug } from "@/lib/constants";
import { ForecastBadge } from "./ForecastBadge";
import { TrendingDown, ArrowRight } from "lucide-react";

interface PlatformCardProps {
  slug: string;
  name: string;
  snapshot: {
    balance: number;
    currency: string;
    dailySpend: number | null;
    daysRemaining: number | null;
    fetchedAt: Date;
  } | null;
}

export function PlatformCard({ slug, name, snapshot }: PlatformCardProps) {
  const config = PLATFORM_CONFIG[slug as PlatformSlug];
  const platformColor = config?.color || "#6b7280";

  return (
    <Link
      href={`/platform/${slug}`}
      className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: platformColor }}
          />
          <h3 className="font-semibold text-slate-900">{name}</h3>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
      </div>

      {snapshot ? (
        <>
          {/* Balance */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(snapshot.balance, snapshot.currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Текущий баланс</p>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                {snapshot.dailySpend !== null
                  ? `${formatNumber(snapshot.dailySpend)} ${snapshot.currency === "RUB" ? "₽" : "$"}/д`
                  : "—"}
              </span>
            </div>
            <ForecastBadge daysRemaining={snapshot.daysRemaining} />
          </div>
        </>
      ) : (
        <div className="text-center py-4 text-sm text-slate-400">
          Нет данных
          <p className="text-xs mt-1">Настройте доступы в настройках</p>
        </div>
      )}
    </Link>
  );
}
