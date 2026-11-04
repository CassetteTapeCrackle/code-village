import type { Env } from "./env";
import { LIMITS } from "./limits";

export type Gate =
  | { ok: true }
  | {
      ok: false;
      status: 429 | 503;
      reason: "quota" | "burst" | "resting" | "paused-new" | "off";
      message: string;
    };

export const BURST_MESSAGE = "One moment: too many questions in a minute.";

// The order matters: every earlier reason hides the ones after it.
export function decide(input: {
  tutorOff: boolean;
  repliesToday: number;
  callsThisMinute: number;
  neuronsToday: number;
  playerNeuronsToday: number;
  playerAgeHours: number;
}): Gate {
  if (input.tutorOff) {
    return {
      ok: false,
      status: 503,
      reason: "off",
      message: "The teacher is away today. Copy the task for your own agent instead.",
    };
  }
  const neuronShare = input.neuronsToday / LIMITS.dailyFreeNeurons;
  if (neuronShare >= 1)
    return { ok: false, status: 503, reason: "resting", message: "The teacher is resting until tomorrow." };
  if (neuronShare >= LIMITS.pauseNewAtShare && input.playerAgeHours < LIMITS.newPlayerHours) {
    return {
      ok: false,
      status: 503,
      reason: "paused-new",
      message: "The teacher is very busy today and helps older nicknames first. Try tomorrow.",
    };
  }
  if (input.repliesToday >= LIMITS.tutorPerDay) {
    return {
      ok: false,
      status: 429,
      reason: "quota",
      message: `You used your ${LIMITS.tutorPerDay} questions for today.`,
    };
  }
  if (input.playerNeuronsToday >= LIMITS.dailyFreeNeurons * LIMITS.playerNeuronShare) {
    return {
      ok: false,
      status: 429,
      reason: "quota",
      message: "You used your share of the teacher for today. Try again tomorrow.",
    };
  }
  if (input.callsThisMinute >= LIMITS.tutorPerMinute) {
    return {
      ok: false,
      status: 429,
      reason: "burst",
      message: BURST_MESSAGE,
    };
  }
  return { ok: true };
}

// Neurons per million tokens, from developers.cloudflare.com/workers-ai/platform/pricing on 2026-10-15.
const PRICES: Record<string, { input: number; output: number }> = {
  "@cf/google/gemma-4-26b-a4b-it": { input: 9_091, output: 27_273 },
  "@cf/openai/gpt-oss-20b": { input: 18_182, output: 27_273 },
  "@cf/mistralai/mistral-small-3.1-24b-instruct": { input: 31_876, output: 50_488 },
  "@cf/openai/gpt-oss-120b": { input: 31_818, output: 68_182 },
};

// Unknown models get the most expensive price per direction, so an estimate never errs low.
const HIGHEST = {
  input: Math.max(...Object.values(PRICES).map((p) => p.input)),
  output: Math.max(...Object.values(PRICES).map((p) => p.output)),
};

// Reasoning tokens bill as output but never appear in the reply text, so the output
// estimate is doubled for the reasoning models; the bake-off can refine this. An unknown
// model counts as reasoning, so its estimate never errs low. Not exported: internal rule.
function isReasoning(model: string): boolean {
  if (model in PRICES) return model.startsWith("@cf/google/gemma") || model.startsWith("@cf/openai/gpt-oss");
  return true;
}

export function estimateNeurons(model: string, inputChars: number, outputChars: number): number {
  const price = PRICES[model] ?? HIGHEST;
  const inputTokens = Math.ceil(inputChars / 4);
  const outputTokens = Math.ceil(outputChars / 4) * (isReasoning(model) ? 2 : 1);
  return Math.ceil((inputTokens * price.input + outputTokens * price.output) / 1_000_000);
}

// What one askModel attempt can bill at worst: the prompt plus the full output cap. Charged
// before every attempt, so an empty, reasoning-only or failed reply still pays its share.
export function maxNeurons(model: string, inputChars: number): number {
  return estimateNeurons(model, inputChars, LIMITS.maxOutputTokens * 4);
}

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const minuteOf = (d: Date): string => d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM, UTC

export async function readCounters(
  env: Env,
  playerId: number,
  now: Date,
): Promise<{
  repliesToday: number;
  callsThisMinute: number;
  neuronsToday: number;
  playerNeuronsToday: number;
}> {
  const quota = await env.DB.prepare(
    "SELECT replies, minute, minute_count AS minuteCount, neurons FROM quota WHERE player_id = ? AND day = ?",
  )
    .bind(playerId, dayOf(now))
    .first<{ replies: number; minute: string; minuteCount: number; neurons: number }>();
  const usage = await env.DB.prepare("SELECT neurons FROM usage WHERE day = ?")
    .bind(dayOf(now))
    .first<{ neurons: number }>();
  return {
    repliesToday: quota?.replies ?? 0,
    // a row left from an earlier minute reads as zero calls, without a write
    callsThisMinute: quota?.minute === minuteOf(now) ? quota.minuteCount : 0,
    neuronsToday: usage?.neurons ?? 0,
    playerNeuronsToday: quota?.neurons ?? 0,
  };
}

// One conditional upsert takes the minute and the day slot together: the counters move only when
// the minute, the day and the player's share of neurons are all under their limit, so parallel
// requests cannot all pass a read-then-write gate. No row back means a slot was gone at write time:
// the caller refuses.
export async function reserveQuestion(env: Env, playerId: number, now: Date): Promise<boolean> {
  const row = await env.DB.prepare(
    `INSERT INTO quota (player_id, day, replies, minute, minute_count) VALUES (?, ?, 1, ?, 1)
     ON CONFLICT(player_id, day) DO UPDATE SET
       replies = quota.replies + 1,
       minute_count = CASE WHEN quota.minute = excluded.minute THEN quota.minute_count + 1 ELSE 1 END,
       minute = excluded.minute
     WHERE quota.replies < ? AND quota.neurons < ? AND (quota.minute != excluded.minute OR quota.minute_count < ?)
     RETURNING replies`,
  )
    .bind(
      playerId,
      dayOf(now),
      minuteOf(now),
      LIMITS.tutorPerDay,
      LIMITS.dailyFreeNeurons * LIMITS.playerNeuronShare,
      LIMITS.tutorPerMinute,
    )
    .first<{ replies: number }>();
  return row !== null;
}

// Neurons are charged worst case before each model attempt and never refunded, to the day and to
// the player's own share. The reply slot is the only thing a failed or empty answer gives back.
export async function countNeurons(env: Env, playerId: number, now: Date, neurons: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO usage (day, neurons) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET neurons = neurons + excluded.neurons",
    ).bind(dayOf(now), neurons),
    env.DB.prepare("UPDATE quota SET neurons = neurons + ? WHERE player_id = ? AND day = ?").bind(
      neurons,
      playerId,
      dayOf(now),
    ),
  ]);
}

export async function refundReply(env: Env, playerId: number, now: Date): Promise<void> {
  await env.DB.prepare(
    "UPDATE quota SET replies = replies - 1 WHERE player_id = ? AND day = ? AND replies > 0",
  )
    .bind(playerId, dayOf(now))
    .run();
}
