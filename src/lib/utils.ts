import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(value: string, now = new Date()) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "just now";

  const diffMs = now.getTime() - time;
  const isFuture = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (absMs < minute) return "just now";

  const format = (amount: number, unit: string) => {
    const rounded = Math.max(1, Math.round(amount));
    const label = `${rounded} ${unit}${rounded === 1 ? "" : "s"}`;
    return isFuture ? `in ${label}` : `${label} ago`;
  };

  if (absMs < hour) return format(absMs / minute, "min");
  if (absMs < day) return format(absMs / hour, "hr");
  if (absMs < week) return format(absMs / day, "day");
  return format(absMs / week, "week");
}
