import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { CAPS } from "../../src/tutor/packet";
import { bundle } from "../../src/content/bundle";
import { lessonTasks } from "../../src/learning/progress";
import { XP } from "../../src/learning/xp";
import { emptyProgress, type Progress } from "../../src/learning/types";
import { eventsFromProgress } from "../../src/sync/events";
import { handle } from "../src/router";

const deps = {
  verifyHuman: async () => true,
  now: () => new Date("2026-10-15T12:00:00Z"),
  askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
};
const H = { "content-type": "application/json" };

async function registerPlayer(nickname: string, ip: string): Promise<{ token: string }> {
  const res = await handle(
    new Request("https://x/api/register", {
      method: "POST",
      headers: { ...H, "cf-connecting-ip": ip },
      body: JSON.stringify({ nickname, turnstile: "t" }),
    }),
    env,
    deps,
  );
  return (await res.json()) as { token: string };
}

function sync(token: string, body: unknown): Promise<Response> {
  return handle(
    new Request("https://x/api/sync", {
      method: "POST",
      headers: { ...H, authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
    env,
    deps,
  );
}

function getSave(token: string): Promise<Response> {
  return handle(
    new Request("https://x/api/save", { headers: { authorization: `Bearer ${token}` } }),
    env,
    deps,
  );
}

async function playerId(key: string): Promise<number> {
  const row = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = ?")
    .bind(key)
    .first<{ id: number }>();
  if (!row) throw new Error(`player missing: ${key}`);
  return row.id;
}

const taskEvent = { kind: "task_passed", id: "values-total-price", at: "2026-10-15", hints: 0, code: "" };

test("the same events sent twice are accepted twice and stored once", async () => {
  const { token } = await registerPlayer("SyncOne", "10.1.0.1");
  const first = await sync(token, { events: [taskEvent] });
  expect(first.status).toBe(200);
  expect(await first.json()).toMatchObject({ accepted: 1, rejected: [] });
  const second = await sync(token, { events: [taskEvent] });
  expect(await second.json()).toMatchObject({ accepted: 1, rejected: [] });
  const rows = await env.DB.prepare("SELECT count(*) AS n FROM events WHERE player_id = ?")
    .bind(await playerId("syncone"))
    .first<{ n: number }>();
  expect(rows?.n).toBe(1);
});

test("an impossible event is reported and not stored", async () => {
  const { token } = await registerPlayer("SyncTwo", "10.1.0.2");
  const res = await sync(token, { events: [{ kind: "lesson_passed", id: "values", at: "2026-10-15" }] });
  const body = (await res.json()) as {
    accepted: number;
    rejected: { id: string; kind: string; reason: string }[];
  };
  expect(body.accepted).toBe(0);
  expect(body.rejected).toEqual([{ id: "values", kind: "lesson_passed", reason: "tasks not passed" }]);
  const rows = await env.DB.prepare("SELECT count(*) AS n FROM events WHERE player_id = ?")
    .bind(await playerId("synctwo"))
    .first<{ n: number }>();
  expect(rows?.n).toBe(0);
});

test("saves carry a revision and refuse to overwrite a newer one", async () => {
  const { token } = await registerPlayer("SyncThree", "10.1.0.3");
  expect(await (await getSave(token)).json()).toEqual({ revision: 0, blob: null });
  const one = await sync(token, { events: [], save: { baseRevision: 0, blob: "one" } });
  expect(((await one.json()) as { revision: number }).revision).toBe(1);
  const two = await sync(token, { events: [], save: { baseRevision: 1, blob: "two" } });
  expect(((await two.json()) as { revision: number }).revision).toBe(2);
  const conflict = await sync(token, { events: [], save: { baseRevision: 1, blob: "late" } });
  expect(conflict.status).toBe(409);
  const body = (await conflict.json()) as { revision: number; blob: string };
  expect(body.revision).toBe(2);
  expect(body.blob).toBe("two");
  expect(await (await getSave(token)).json()).toEqual({ revision: 2, blob: "two" });
});

test("sync and save need a token", async () => {
  expect(
    (
      await handle(
        new Request("https://x/api/sync", {
          method: "POST",
          headers: H,
          body: JSON.stringify({ events: [] }),
        }),
        env,
        deps,
      )
    ).status,
  ).toBe(401);
  expect((await handle(new Request("https://x/api/save"), env, deps)).status).toBe(401);
});

test("junk events are a 400", async () => {
  const { token } = await registerPlayer("SyncFour", "10.1.0.4");
  const res = await sync(token, { events: [{ kind: "xp_granted" }] });
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "Some events are not valid." });
});

test("more than the per-sync cap is a 413", async () => {
  const { token } = await registerPlayer("SyncFive", "10.1.0.5");
  const res = await sync(token, { events: Array.from({ length: 501 }, () => taskEvent) });
  expect(res.status).toBe(413);
});

const snapshot = {
  taskId: "values-total-price",
  code: "print(1)",
  check: { error: null, results: [{ name: "one", passed: false, message: "returned 3, expected 4" }] },
  checks: 2,
  hints: 1,
};

test("a snapshot round-trips, is overwritten by the next Check, and its code is cut to the cap", async () => {
  const { token } = await registerPlayer("SnapOne", "10.1.0.11");
  expect((await sync(token, { events: [], snapshot })).status).toBe(200);
  const player = await playerId("snapone");
  const row = await env.DB.prepare(
    "SELECT task_id AS taskId, code, check_json AS checkJson, checks, hints FROM snapshots WHERE player_id = ?",
  )
    .bind(player)
    .first();
  expect(row).toEqual({
    taskId: snapshot.taskId,
    code: "print(1)",
    checkJson: JSON.stringify(snapshot.check),
    checks: 2,
    hints: 1,
  });

  const second = { ...snapshot, code: "y".repeat(6500), checks: 3 };
  expect((await sync(token, { events: [], snapshot: second })).status).toBe(200);
  const rows = await env.DB.prepare("SELECT code, checks FROM snapshots WHERE player_id = ?")
    .bind(player)
    .all<{ code: string; checks: number }>();
  expect(rows.results).toHaveLength(1);
  expect(rows.results[0]?.code.length).toBe(CAPS.code);
  expect(rows.results[0]?.checks).toBe(3);
});

test("a snapshot with an unknown task or a bad shape is a 400 and nothing is stored", async () => {
  const { token } = await registerPlayer("SnapTwo", "10.1.0.12");
  const bad = [
    { ...snapshot, taskId: "no-such-task" },
    { ...snapshot, code: 3 },
    { ...snapshot, checks: -1 },
    { ...snapshot, hints: 1.5 },
    { ...snapshot, check: { error: null } },
    { ...snapshot, check: { error: 7, results: [] } },
    { ...snapshot, check: [{ error: null, results: [] }] },
  ];
  for (const candidate of bad) {
    const res = await sync(token, { events: [], snapshot: candidate });
    expect(res.status, JSON.stringify(candidate)).toBe(400);
    expect(await res.json()).toEqual({ error: "That snapshot is not valid." });
  }
  const count = await env.DB.prepare("SELECT count(*) AS n FROM snapshots WHERE player_id = ?")
    .bind(await playerId("snaptwo"))
    .first<{ n: number }>();
  expect(count?.n).toBe(0);
});

test("a save that is not an object is a 400", async () => {
  const { token } = await registerPlayer("SyncSix", "10.1.0.7");
  const res = await sync(token, { events: [], save: null });
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "That save is not valid." });
});

test("a full offline progress backfills onto the board", async () => {
  const p: Progress = emptyProgress();
  for (const lesson of bundle.lessons) {
    for (const t of lessonTasks(lesson))
      p.tasks[t.id] = { passedAt: "2026-10-15", hintsUsed: 0, checks: 0, xpEarned: 0 };
    p.lessons[lesson.id] = { passedAt: "2026-10-15" };
  }
  for (const boss of bundle.bosses) {
    p.bosses[boss.id] = {
      stagesPassed: boss.stages.map((s) => s.id),
      wonAt: "2026-10-15",
      hardWonAt: "2026-10-15",
      hardChecks: 3,
    };
  }
  const { token } = await registerPlayer("Backfill", "10.1.0.6");
  const events = eventsFromProgress(p);
  const res = await sync(token, { events });
  const body = (await res.json()) as { accepted: number; rejected: unknown[] };
  expect(body.rejected).toEqual([]);
  expect(body.accepted).toBe(events.length);
  const cache = (caches as { default?: Cache }).default;
  await cache?.delete("https://x/api/leaderboard");
  const board = await handle(new Request("https://x/api/leaderboard"), env, deps);
  const data = (await board.json()) as { rows: { nickname: string; xp: number }[] };
  // Every task and lesson the bundle ships, tour lesson included, plus both wins of every boss.
  const expected =
    bundle.lessons.reduce((sum, lesson) => sum + lessonTasks(lesson).length * XP.taskClean + XP.lesson, 0) +
    bundle.bosses.reduce((sum, boss) => sum + boss.stages.length * XP.bossStage + XP.bossWin + XP.hardWin, 0);
  expect(data.rows.find((r) => r.nickname === "Backfill")?.xp).toBe(expected);
});
