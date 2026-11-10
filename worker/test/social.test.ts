import { env } from "cloudflare:workers";
import { beforeAll, expect, test } from "vitest";
import { bundle } from "../../src/content/bundle";
import { addDays } from "../../src/learning/dates";
import { handle } from "../src/router";
import { forgetSocialAnswers } from "../src/routes/social";

const deps = {
  verifyHuman: async () => true,
  now: () => new Date("2026-10-15T12:00:00Z"),
  askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
};

async function seedPlayer(nickname: string, createdAt: string, lastActive: string): Promise<number> {
  await env.DB.prepare(
    "INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(nickname, nickname.toLowerCase(), `recovery-${nickname}`, createdAt, lastActive)
    .run();
  const row = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = ?")
    .bind(nickname.toLowerCase())
    .first<{ id: number }>();
  if (!row) throw new Error(`player missing: ${nickname}`);
  return row.id;
}

async function seedEvent(
  playerId: number,
  kind: string,
  itemId: string,
  at: string,
  received: string,
  hints: number | null = null,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO events (player_id, kind, item_id, at, received, hints, code) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(playerId, kind, itemId, at, received, hints, kind === "task_passed" ? "" : null)
    .run();
}

const get = (path: string): Promise<Response> => handle(new Request(`https://x${path}`), env, deps);
type Board = {
  period: string;
  rows: {
    nickname: string;
    xp: number;
    level: number;
    lessons: number;
    bossesWon: number;
    hardWins: number;
    furthestWorld: string | null;
    lastActive: string;
  }[];
};

beforeAll(async () => {
  const ada = await seedPlayer("Ada", "2026-10-01T09:00:00.000Z", "2026-10-14");
  await seedEvent(ada, "task_passed", "values-total-price", "2026-10-15", "2026-10-15", 0);
  await seedEvent(ada, "lesson_passed", "values", "2026-10-01", "2026-10-01");
  await seedEvent(ada, "boss_won", "guessing-stone", "2026-10-10", "2026-10-10");
  const grace = await seedPlayer("Grace", "2026-10-02T09:00:00.000Z", "2026-10-13");
  await seedEvent(grace, "task_passed", "values-add-strings", "2026-10-01", "2026-10-01", 2);
});

test("the board orders by XP and carries cache headers", async () => {
  const res = await get("/api/leaderboard");
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  const board = (await res.json()) as Board;
  expect(board.period).toBe("all");
  expect(board.rows).toEqual([
    {
      nickname: "Ada",
      xp: 135,
      level: 2,
      lessons: 1,
      bossesWon: 1,
      hardWins: 0,
      furthestWorld: "w1",
      lastActive: "2026-10-14",
    },
    {
      nickname: "Grace",
      xp: 8,
      level: 1,
      lessons: 0,
      bossesWon: 0,
      hardWins: 0,
      furthestWorld: null,
      lastActive: "2026-10-13",
    },
  ]);
});

test("the week board counts only this week's events", async () => {
  const res = await get("/api/leaderboard?period=week");
  expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  const board = (await res.json()) as Board;
  expect(board.period).toBe("week");
  expect(board.rows).toEqual([
    {
      nickname: "Ada",
      xp: 15,
      level: 1,
      lessons: 0,
      bossesWon: 0,
      hardWins: 0,
      furthestWorld: null,
      lastActive: "2026-10-14",
    },
  ]);
});

test("a banned player disappears from the board, the card and the news", async () => {
  await env.DB.prepare("INSERT INTO flags (key, value) VALUES (?, ?)").bind("ban:grace", "1").run();
  // the first all-board answer is cached for 60 s, so drop it to read a fresh one
  const cache = (caches as { default?: Cache }).default;
  await cache?.delete("https://x/api/leaderboard");
  forgetSocialAnswers();
  const all = (await (await get("/api/leaderboard")).json()) as Board;
  expect(all.rows.map((r) => r.nickname)).toEqual(["Ada"]);
  const week = (await (await get("/api/leaderboard?period=week")).json()) as Board;
  expect(week.rows.map((r) => r.nickname)).toEqual(["Ada"]);
  const card = await get("/api/players/Grace");
  expect(card.status).toBe(404);
  expect(await card.json()).toEqual({ error: "No such player." });
  const news = (await (await get("/api/news")).json()) as { items: { nickname: string }[] };
  expect(news.items.some((i) => i.nickname === "Grace")).toBe(false);
});

test("a player card is case-insensitive and lists trophies and recent news", async () => {
  const res = await get("/api/players/ADA");
  expect(res.status).toBe(200);
  const card = (await res.json()) as {
    nickname: string;
    xp: number;
    joined: string;
    trophies: string[];
    recent: { nickname: string; kind: string; id: string; day: string }[];
  };
  expect(card.nickname).toBe("Ada");
  expect(card.xp).toBe(135);
  expect(card.joined).toBe("2026-10-01T09:00:00.000Z");
  expect(card.trophies).toEqual(["Quarry Key"]);
  expect(card.recent).toEqual([
    { nickname: "Ada", kind: "boss_won", id: "guessing-stone", day: "2026-10-10" },
    { nickname: "Ada", kind: "lesson_passed", id: "values", day: "2026-10-01" },
  ]);
});

test("news is newest first and capped at thirty", async () => {
  const newsy = await seedPlayer("Newsy", "2026-10-03T09:00:00.000Z", "2026-10-15");
  const lessons = bundle.lessons.map((l) => l.id);
  expect(lessons.length).toBeGreaterThan(30);
  for (let i = 0; i < lessons.length; i++) {
    const day = addDays("2026-10-16", i);
    await seedEvent(newsy, "lesson_passed", lessons[i], day, day);
  }
  const cache = (caches as { default?: Cache }).default;
  await cache?.delete("https://x/api/news");
  forgetSocialAnswers();
  const res = await get("/api/news");
  const feed = (await res.json()) as { items: { nickname: string; kind: string; id: string; day: string }[] };
  expect(feed.items.length).toBe(30);
  expect(feed.items[0].nickname).toBe("Newsy");
  expect(feed.items[0].id).toBe(lessons[lessons.length - 1]);
  expect(feed.items[0].day).toBe(addDays("2026-10-16", lessons.length - 1));
});

test("a player name with a bad escape is a plain 404", async () => {
  const res = await get("/api/players/%zz");
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "No such player." });
});

test("junk query parameters share the plain board's cache entry", async () => {
  const cache = (caches as { default?: Cache }).default;
  await cache?.delete("https://x/api/leaderboard");
  forgetSocialAnswers();
  await get("/api/leaderboard?x=random&period=all");
  // the canonical key, not the raw URL, so the entry is reachable without the junk parameters
  expect(await cache?.match("https://x/api/leaderboard")).toBeTruthy();
});

test("without the edge cache (a workers.dev host), the Worker still answers from memory for 60 s", async () => {
  const cache = (caches as { default?: Cache }).default;
  await cache?.delete("https://x/api/leaderboard");
  forgetSocialAnswers();
  const before = (await (await get("/api/leaderboard")).json()) as Board;
  const id = await seedPlayer("Latecomer", "2026-10-15T08:00:00.000Z", "2026-10-15");
  await cache?.delete("https://x/api/leaderboard"); // what workers.dev does: nothing was kept at the edge
  const after = (await (await get("/api/leaderboard")).json()) as Board;
  expect(after).toEqual(before);
  await env.DB.prepare("DELETE FROM players WHERE id = ?").bind(id).run();
  forgetSocialAnswers();
});
