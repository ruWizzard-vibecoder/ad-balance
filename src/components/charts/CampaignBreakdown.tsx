"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

interface CampaignBreakdownProps {
  campaigns: {
    name: string;
    spend: { date: Date | string; spend: number }[];
  }[];
}

export function CampaignBreakdown({ campaigns }: CampaignBreakdownProps) {
  if (!campaigns.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Нет данных по кампаниям
      </div>
    );
  }

  // Build data by date with campaign names as keys
  const dateMap = new Map<string, Record<string, string | number>>();

  for (const camp of campaigns) {
    for (const s of camp.spend) {
      const dateStr =
        typeof s.date === "string"
          ? s.date.slice(0, 10)
          : format(new Date(s.date), "yyyy-MM-dd");
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr });
      }
      const point = dateMap.get(dateStr)!;
      point[camp.name] = ((point[camp.name] as number) || 0) + s.spend;
    }
  }

  const chartData = Array.from(dateMap.values()).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string)
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(val) => {
            try {
              return format(new Date(val), "dd MMM", { locale: ru });
            } catch {
              return val;
            }
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
        />
        <Legend />
        {campaigns.map((camp, i) => (
          <Bar
            key={camp.name}
            dataKey={camp.name}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
