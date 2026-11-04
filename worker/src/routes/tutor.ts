import { bundle } from "../../../src/content/bundle";
import type { Lesson, Task } from "../../../src/content/types";
import type { CheckResult } from "../../../src/runner/protocol";
import { tutorMessages, type Snapshot, type Turn } from "../../../src/tutor/packet";
import { playerFor } from "../auth";
import type { Deps, Env } from "../env";
import { fail, json, readBody } from "../http";
import { LIMITS } from "../limits";
import {
  BURST_MESSAGE,
  countNeurons,
  decide,
  maxNeurons,
  readCounters,
  refundReply,
  reserveQuestion,
} from "../tutorLimits";

const SIGNOUT = "Sign in again: this device is not registered.";
const BUSY = "The teacher is busy. Try again in a moment.";

// Exported for its test: every model read gets a deadline, so a hung call still ends in the busy path.
export function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The model did not answer in time.")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function findTask(taskId: string): { lesson: Lesson; task: Task } | null {
  for (const lesson of bundle.lessons) {
    for (const block of lesson.blocks) {
      if (block.type === "task" && block.task.id === taskId) return { lesson, task: block.task };
    }
  }
  return null;
}

function turnsOf(value: unknown): Turn[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const turns: Turn[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const turn = item as Record<string, unknown>;
    if (turn.role !== "learner" && turn.role !== "tutor") return null;
    if (typeof turn.text !== "string") return null;
    turns.push({ role: turn.role, text: turn.text });
  }
  return turns;
}

function checkOf(checkJson: string | null): CheckResult | null {
  if (checkJson === null) return null;
  try {
    return JSON.parse(checkJson) as CheckResult;
  } catch {
    return null;
  }
}

export async function tutor(request: Request, env: Env, deps: Deps): Promise<Response> {
  const now = deps.now();
  const player = await playerFor(request, env, "main", now.toISOString().slice(0, 10));
  if (!player) return fail(401, SIGNOUT);
  const body = await readBody(request, LIMITS.maxBodyBytes);
  if (body instanceof Response) return body;
  const { taskId, message, recentTurns } = (body ?? {}) as {
    taskId?: unknown;
    message?: unknown;
    recentTurns?: unknown;
  };
  const found = typeof taskId === "string" ? findTask(taskId) : null;
  if (!taskId || !found) return fail(400, "No such task.");
  if (typeof message !== "string" || message.trim().length === 0) return fail(400, "Ask a question first.");
  const turns = turnsOf(recentTurns);
  if (turns === null) return fail(400, "That request is not valid.");

  const tutorOff = (await env.DB.prepare("SELECT value FROM flags WHERE key = 'tutor_off'").first()) !== null;
  const created = await env.DB.prepare("SELECT created_at AS createdAt FROM players WHERE id = ?")
    .bind(player.id)
    .first<{ createdAt: string }>();
  // an unknown age counts as a brand new nickname
  const playerAgeHours = created ? (now.getTime() - Date.parse(created.createdAt)) / 3_600_000 : 0;
  const counters = await readCounters(env, player.id, now);
  const gate = decide({ tutorOff, playerAgeHours, ...counters });
  if (!gate.ok) return json({ error: gate.message, reason: gate.reason }, gate.status);
  // Take both slots atomically: a request that loses the race is refused, never counted.
  if (!(await reserveQuestion(env, player.id, now))) {
    const latest = await readCounters(env, player.id, now);
    const raced = decide({ tutorOff, playerAgeHours, ...latest });
    return raced.ok
      ? json({ error: BURST_MESSAGE, reason: "burst" }, 429)
      : json({ error: raced.message, reason: raced.reason }, raced.status);
  }

  const row = await env.DB.prepare(
    "SELECT task_id AS taskId, code, check_json AS checkJson, checks, hints FROM snapshots WHERE player_id = ?",
  )
    .bind(player.id)
    .first<{ taskId: string; code: string; checkJson: string | null; checks: number; hints: number }>();
  const snapshot: Snapshot | null =
    row && row.taskId === taskId
      ? {
          taskId: row.taskId,
          code: row.code,
          check: checkOf(row.checkJson),
          checks: row.checks,
          hints: row.hints,
        }
      : null;

  const messages = tutorMessages(found.lesson, found.task, snapshot, turns, message);
  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const send = (payload: object): Promise<void> =>
    writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

  deps.waitUntil(
    (async () => {
      let reply = "";
      let started = false;
      let finished = false;
      for (let attempt = 0; attempt < 2 && !finished; attempt++) {
        let reader: ReadableStreamDefaultReader<string> | null = null;
        try {
          // Charged before every attempt: the model bills a failed, empty or reasoning-only reply too.
          await countNeurons(env, player.id, now, maxNeurons(env.TUTOR_MODEL, promptChars));
          const stream = await withDeadline(deps.askModel(messages), LIMITS.tutorDeadlineMs);
          reader = stream.getReader();
          for (;;) {
            const { value, done } = await withDeadline(reader.read(), LIMITS.tutorDeadlineMs);
            if (done) break;
            if (!value) continue;
            started = true;
            reply += value;
            await send({ text: value });
          }
          finished = true;
        } catch {
          if (reader) await reader.cancel().catch(() => undefined);
          if (started) break; // the reply already began: keep what arrived, still count it once
        }
      }
      try {
        // an empty answer is a failure: give the reply slot back, the neurons stay charged
        if (reply.length === 0) await refundReply(env, player.id, now);
        await send(finished && reply.length > 0 ? { done: true } : { error: BUSY });
      } catch {
        // the client went away or the counters failed: nothing left to say
      } finally {
        await writer.close().catch(() => {});
      }
    })(),
  );

  return new Response(readable, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
  });
}
