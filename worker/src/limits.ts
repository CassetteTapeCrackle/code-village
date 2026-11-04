import type { Env } from "./env";
import { sha256Hex } from "./crypto.ts";

export const LIMITS = {
  registerPerIpPerDay: 3,
  recoverPerIpPerDay: 10,
  maxBodyBytes: 600_000,
  maxEventsPerSync: 500,
  maxSaveChars: 500_000,
  inactiveDays: 365,
  leaderboardCacheSeconds: 60,
  newsItems: 30,
  tutorPerDay: 25,
  tutorPerMinute: 4,
  dailyFreeNeurons: 10_000,
  pauseNewAtShare: 0.8,
  // no player spends more than this share of the day's budget: it then takes 20 nicknames, not 7, to use it
  // all, and the free budget only answers about 8 questions per learner across a class of 30 anyway
  playerNeuronShare: 0.05,
  newPlayerHours: 24,
  maxOutputTokens: 300,
  tutorDeadlineMs: 30_000,
} as const;

// The rate limiting binding only counts per 10 or 60 seconds, so the per-day IP limit lives in D1
// as a salted hash bucket: the IP itself is never written anywhere.
export async function takeIpSlot(
  env: Env,
  ip: string | null,
  action: "register" | "recover",
  day: string,
): Promise<boolean> {
  const max = action === "register" ? LIMITS.registerPerIpPerDay : LIMITS.recoverPerIpPerDay;
  const bucket = await sha256Hex(`${env.IP_SALT}|${day}|${action}|${ip ?? "unknown"}`);
  await env.DB.prepare("DELETE FROM ip_buckets WHERE day < ?").bind(day).run();
  const row = await env.DB.prepare(
    "INSERT INTO ip_buckets (bucket, day, count) VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET count = count + 1 RETURNING count",
  )
    .bind(bucket, day)
    .first<{ count: number }>();
  return (row?.count ?? max + 1) <= max;
}
