import type { DailySpend } from "./platforms/types";

export function calculateForecast(
  balance: number,
  dailySpendData: DailySpend[]
): { dailySpend: number; daysRemaining: number | null } {
  if (dailySpendData.length === 0) {
    return { dailySpend: 0, daysRemaining: null };
  }

  // Calculate average daily spend from data with actual spend > 0
  const nonZeroDays = dailySpendData.filter((d) => d.spend > 0);
  if (nonZeroDays.length === 0) {
    return { dailySpend: 0, daysRemaining: null };
  }

  const totalSpend = nonZeroDays.reduce((sum, d) => sum + d.spend, 0);
  const dailySpend = totalSpend / nonZeroDays.length;

  const daysRemaining = dailySpend > 0 ? Math.floor(balance / dailySpend) : null;

  return { dailySpend, daysRemaining };
}
