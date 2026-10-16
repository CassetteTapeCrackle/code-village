import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { LIMITS } from "../src/limits";
import {
  countNeurons,
  decide,
  estimateNeurons,
  maxNeurons,
  readCounters,
  refundReply,
  reserveQuestion,
} from "../src/tutorLimits";

const AT_NOON = new Date("2026-10-15T12:00:00Z");
const base = { tutorOff: false, repliesToday: 0, callsThisMinute: 0, neuronsToday: 0, playerAgeHours: 48 };

test("all fine lets the request through", () => {
  expect(decide(base)).toEqual({ ok: true });
});

test("the kill switch wins over every other reason", () => {
  const gate = decide({
    ...base,
    tutorOff: true,
    neuronsToday: LIMITS.dailyFreeNeurons,
    repliesToday: LIMITS.tutorPerDay,
    callsThisMinute: LIMITS.tutorPerMinute,
  });
  expect(gate).toEqual({
    ok: false,
    status: 503,
    reason: "off",
    message: "The teacher is away today. Copy the task for your own agent instead.",
  });
});

test("a spent neuron budget rests before the quota is considered", () => {
  const gate = decide({
    ...base,
    neuronsToday: LIMITS.dailyFreeNeurons,
    repliesToday: LIMITS.tutorPerDay,
    callsThisMinute: LIMITS.tutorPerMinute,
  });
  expect(gate).toEqual({
    ok: false,
    status: 503,
    reason: "resting",
    message: "The teacher is resting until tomorrow.",
  });
});

test("a young nickname is paused above the pause share", () => {
  const gate = decide({
    ...base,
    neuronsToday: LIMITS.dailyFreeNeurons * LIMITS.pauseNewAtShare,
    playerAgeHours: LIMITS.newPlayerHours - 1,
    repliesToday: 99,
  });
  expect(gate).toEqual({
    ok: false,
    status: 503,
    reason: "paused-new",
    message: "The teacher is very busy today and helps older nicknames first. Try tomorrow.",
  });
});

test("an older nickname above the pause share is not paused", () => {
  const gate = decide({
    ...base,
    neuronsToday: LIMITS.dailyFreeNeurons * LIMITS.pauseNewAtShare,
    playerAgeHours: LIMITS.newPlayerHours,
    repliesToday: LIMITS.tutorPerDay,
  });
  expect(gate).toEqual({
    ok: false,
    status: 429,
    reason: "quota",
    message: `You used your ${LIMITS.tutorPerDay} questions for today.`,
  });
});

test("the daily quota refuses the next question", () => {
  const gate = decide({ ...base, repliesToday: LIMITS.tutorPerDay });
  expect(gate).toEqual({
    ok: false,
    status: 429,
    reason: "quota",
    message: `You used your ${LIMITS.tutorPerDay} questions for today.`,
  });
});

test("too many questions in one minute are a burst", () => {
  const gate = decide({ ...base, callsThisMinute: LIMITS.tutorPerMinute });
  expect(gate).toEqual({
    ok: false,
    status: 429,
    reason: "burst",
    message: "One moment: too many questions in a minute.",
  });
});

test("counters read for a new UTC day are zero", async () => {
  await env.DB.prepare(
    "INSERT INTO quota (player_id, day, replies, minute, minute_count) VALUES (9001, '2026-10-14', 20, '2026-10-14T23:59', 3)",
  ).run();
  await env.DB.prepare("INSERT INTO usage (day, neurons) VALUES ('2026-10-14', 5000)").run();
  expect(await readCounters(env, 9001, AT_NOON)).toEqual({
    repliesToday: 0,
    callsThisMinute: 0,
    neuronsToday: 0,
  });
});

test("a minute from the previous minute reads as zero calls", async () => {
  await env.DB.prepare(
    "INSERT INTO quota (player_id, day, replies, minute, minute_count) VALUES (9004, '2026-10-15', 7, '2026-10-15T11:59', 3)",
  ).run();
  expect(await readCounters(env, 9004, AT_NOON)).toEqual({
    repliesToday: 7,
    callsThisMinute: 0,
    neuronsToday: 0,
  });
});

test("reserveQuestion takes one minute and one reply slot, and starts the minute over", async () => {
  const later = new Date("2026-10-15T12:01:00Z");
  expect(await reserveQuestion(env, 9002, AT_NOON)).toBe(true);
  expect(await reserveQuestion(env, 9002, AT_NOON)).toBe(true);
  expect(await readCounters(env, 9002, AT_NOON)).toEqual({
    repliesToday: 2,
    callsThisMinute: 2,
    neuronsToday: 0,
  });
  expect(await reserveQuestion(env, 9002, later)).toBe(true);
  expect(await readCounters(env, 9002, later)).toEqual({
    repliesToday: 3,
    callsThisMinute: 1,
    neuronsToday: 0,
  });
});

test("reserveQuestion refuses once the minute or the day is full", async () => {
  for (let i = 0; i < LIMITS.tutorPerMinute; i++)
    expect(await reserveQuestion(env, 9005, AT_NOON)).toBe(true);
  expect(await reserveQuestion(env, 9005, AT_NOON)).toBe(false);
  expect((await readCounters(env, 9005, AT_NOON)).callsThisMinute).toBe(LIMITS.tutorPerMinute);
  // a full day refuses even in a fresh minute
  await env.DB.prepare("UPDATE quota SET replies = ? WHERE player_id = ?")
    .bind(LIMITS.tutorPerDay, 9005)
    .run();
  expect(await reserveQuestion(env, 9005, new Date("2026-10-15T12:05:00Z"))).toBe(false);
});

test("countNeurons adds to the day, refundReply gives the reply slot back but keeps the neurons", async () => {
  await reserveQuestion(env, 9003, AT_NOON);
  await countNeurons(env, AT_NOON, 100);
  expect(await readCounters(env, 9003, AT_NOON)).toEqual({
    repliesToday: 1,
    callsThisMinute: 1,
    neuronsToday: 100,
  });
  await refundReply(env, 9003, AT_NOON);
  expect(await readCounters(env, 9003, AT_NOON)).toEqual({
    repliesToday: 0,
    callsThisMinute: 1,
    neuronsToday: 100,
  });
  await refundReply(env, 9003, AT_NOON);
  expect((await readCounters(env, 9003, AT_NOON)).repliesToday).toBe(0);
});

test("maxNeurons bills the full output cap, doubled for a reasoning model", () => {
  // 0 input, 300 output tokens: 300 * 27273 doubled for reasoning, and 300 * 50488 plain
  expect(maxNeurons("@cf/google/gemma-4-26b-a4b-it", 0)).toBe(17);
  expect(maxNeurons("@cf/mistralai/mistral-small-3.1-24b-instruct", 0)).toBe(16);
  // 4000 input chars is 1000 tokens, on top of the capped output
  expect(maxNeurons("@cf/google/gemma-4-26b-a4b-it", 4000)).toBe(26);
});

const KNOWN = [
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/openai/gpt-oss-20b",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/openai/gpt-oss-120b",
];

test("the estimate bills reasoning output twice", () => {
  // 4000 input chars is 1000 tokens; 800 output chars is 200 tokens, billed as 400 on a reasoning model
  expect(estimateNeurons("@cf/google/gemma-4-26b-a4b-it", 4000, 800)).toBe(21);
  expect(estimateNeurons("@cf/mistralai/mistral-small-3.1-24b-instruct", 4000, 800)).toBe(42);
});

test("an unknown model never estimates lower than a known one", () => {
  for (const [input, output] of [
    [10_000, 0],
    [0, 10_000],
    [4_000, 800],
    [0, 0],
  ]) {
    const unknown = estimateNeurons("mystery/model", input, output);
    for (const model of KNOWN)
      expect(unknown, `${model} at ${input}/${output}`).toBeGreaterThanOrEqual(
        estimateNeurons(model, input, output),
      );
  }
});
