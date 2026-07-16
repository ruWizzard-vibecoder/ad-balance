"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getUrgencyColor } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Bell, Check, X } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  critical: "Критический",
  warning: "Предупреждение",
  caution: "Внимание",
};

export default function HistoryPage() {
  const [filterSlug, setFilterSlug] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.alerts.list.queryOptions({
      slug: filterSlug || undefined,
      level: filterLevel || undefined,
      limit: 50,
    })
  );

  const { data: stats } = useQuery(trpc.alerts.stats.queryOptions());

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">История алертов</h1>
        {stats && (
          <div className="flex gap-3 text-sm text-slate-500">
            <span>24ч: {stats.count24h}</span>
            <span>7д: {stats.count7d}</span>
            <span>Всего: {stats.total}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterSlug}
          onChange={(e) => setFilterSlug(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        >
          <option value="">Все платформы</option>
          <option value="vk-ads">VK Ads</option>
          <option value="unity-ads">Unity Ads</option>
          <option value="mintegral">Mintegral</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
        >
          <option value="">Все уровни</option>
          <option value="critical">Критический</option>
          <option value="warning">Предупреждение</option>
          <option value="caution">Внимание</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Загрузка...</div>
        ) : !data?.items.length ? (
          <div className="p-8 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Алертов пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Дата
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Аккаунт
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">
                    Уровень
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">
                    Дней
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">
                    Баланс
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">
                    Расход/д
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">
                    Slack
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((alert) => {
                  const colors = getUrgencyColor(alert.level);
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 text-slate-600">
                        {format(new Date(alert.createdAt), "dd MMM HH:mm", {
                          locale: ru,
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{alert.accountName}</div>
                        <div className="text-xs text-slate-400">{alert.platformName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            colors.bg,
                            colors.text
                          )}
                        >
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full", colors.dot)}
                          />
                          {LEVEL_LABELS[alert.level] || alert.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {alert.daysRemaining.toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {alert.balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {alert.dailySpend.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {alert.slackSent ? (
                          <Check className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
