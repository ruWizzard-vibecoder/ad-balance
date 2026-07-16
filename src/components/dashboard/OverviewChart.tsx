"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { PLATFORM_CONFIG, type PlatformSlug } from "@/lib/constants";

const EXTRA_COLORS = [
  "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B", "#6366F1",
  "#EF4444", "#10B981", "#F97316", "#06B6D4", "#84CC16",
];

interface ChartPoint {
  date: string;
  [key: string]: number | string;
}

export function OverviewChart() {
  const trpc = useTRPC();
  const { data: accounts } = useQuery(trpc.balances.latest.queryOptions());

  const historyQueries = useQueries({
    queries: (accounts || []).map((acc) =>
      trpc.balances.history.queryOptions({ accountId: acc.account.id, days: 30 })
    ),
  });

  const dateMap = new Map<string, ChartPoint>();
  const accountMeta: { key: string; name: string; color: string }[] = [];

  // Track how many accounts we've seen per platform slug for color assignment
  const slugCounts: Record<string, number> = {};

  (accounts || []).forEach((acc, idx) => {
    const history = historyQueries[idx]?.data;
    if (!history) return;

    const key = acc.account.id;
    const slug = acc.platform.slug;
    const config = PLATFORM_CONFIG[slug as PlatformSlug];

    slugCounts[slug] = (slugCounts[slug] || 0);
    const color = slugCounts[slug] === 0
      ? (config?.color || EXTRA_COLORS[idx % EXTRA_COLORS.length])
      : EXTRA_COLORS[(idx + slugCounts[slug]) % EXTRA_COLORS.length];
    slugCounts[slug]++;

    accountMeta.push({ key, name: acc.account.name, color });

    for (const s of history) {
      const dateStr = format(new Date(s.fetchedAt), "yyyy-MM-dd");
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr });
      }
      dateMap.get(dateStr)![key] = s.dailySpend ?? 0;
    }
  });

  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Динамика расходов
        </h2>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  const nameLookup = Object.fromEntries(accountMeta.map((m) => [m.key, m.name]));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Динамика расходов (30 дней)
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(val) => {
              try {
                return format(parseISO(val), "dd MMM", { locale: ru });
              } catch {
                return val;
              }
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(val) => {
              try {
                return format(parseISO(val as string), "d MMMM yyyy", {
                  locale: ru,
                });
              } catch {
                return val as string;
              }
            }}
            formatter={(value: number, name: string) => {
              return [`${value.toFixed(2)}`, nameLookup[name] || name];
            }}
          />
          <Legend
            formatter={(value: string) => nameLookup[value] || value}
          />
          {accountMeta.map((m) => (
            <Area
              key={m.key}
              type="monotone"
              dataKey={m.key}
              stackId="1"
              stroke={m.color}
              fill={m.color}
              fillOpacity={0.15}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
