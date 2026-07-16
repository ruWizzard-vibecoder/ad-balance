"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

interface BalanceChartProps {
  data: { fetchedAt: Date | string; balance: number }[];
  color: string;
  currency: string;
}

export function BalanceChart({ data, color, currency }: BalanceChartProps) {
  // Aggregate by day — take last value per day
  const dayMap = new Map<string, number>();
  for (const s of data) {
    const dateStr = format(new Date(s.fetchedAt), "yyyy-MM-dd");
    dayMap.set(dateStr, s.balance);
  }

  const chartData = Array.from(dayMap.entries())
    .map(([date, balance]) => ({ date, balance }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const currencySymbol = currency === "RUB" ? "₽" : "$";

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Нет данных
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
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
          formatter={(value: number) => [
            `${value.toFixed(2)} ${currencySymbol}`,
            "Баланс",
          ]}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
