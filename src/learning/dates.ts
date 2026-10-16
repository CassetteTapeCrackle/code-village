import type { Day } from "./types";

const pad = (n: number): string => String(n).padStart(2, "0");

export function today(now: Date = new Date()): Day {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// day arithmetic in UTC, so clock changes never shift a date
function toUtc(day: Day): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(day: Day, n: number): Day {
  const t = new Date(toUtc(day) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}
