import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "RUB") {
  const symbols: Record<string, string> = {
    RUB: "₽",
    USD: "$",
    EUR: "€",
  };
  const symbol = symbols[currency] || currency;
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${symbol}`;
}

export function formatNumber(n: number) {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

export function getUrgencyLevel(
  daysRemaining: number | null,
  thresholds: { critical: number; warning: number; caution: number }
) {
  if (daysRemaining === null) return "unknown";
  if (daysRemaining <= thresholds.critical) return "critical";
  if (daysRemaining <= thresholds.warning) return "warning";
  if (daysRemaining <= thresholds.caution) return "caution";
  return "ok";
}

export function getUrgencyColor(level: string) {
  switch (level) {
    case "critical":
      return { bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/30", dot: "bg-red-500" };
    case "warning":
      return { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30", dot: "bg-orange-500" };
    case "caution":
      return { bg: "bg-yellow-500/10", text: "text-yellow-600", border: "border-yellow-500/30", dot: "bg-yellow-500" };
    case "ok":
      return { bg: "bg-green-500/10", text: "text-green-600", border: "border-green-500/30", dot: "bg-green-500" };
    default:
      return { bg: "bg-gray-500/10", text: "text-gray-500", border: "border-gray-500/30", dot: "bg-gray-500" };
  }
}
