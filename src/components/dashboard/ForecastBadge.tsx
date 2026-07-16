"use client";

import { cn } from "@/lib/utils";
import { getUrgencyLevel, getUrgencyColor } from "@/lib/utils";
import { DEFAULT_THRESHOLDS } from "@/lib/constants";

export function ForecastBadge({
  daysRemaining,
  className,
}: {
  daysRemaining: number | null;
  className?: string;
}) {
  const level = getUrgencyLevel(daysRemaining, DEFAULT_THRESHOLDS);
  const colors = getUrgencyColor(level);

  const label =
    daysRemaining === null
      ? "Нет данных"
      : daysRemaining <= 0
        ? "Исчерпан"
        : `${daysRemaining} дн.`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        colors.bg,
        colors.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
      {label}
    </span>
  );
}
