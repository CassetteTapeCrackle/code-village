import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { addDays } from "../../src/learning/dates";
import { deleteInactive } from "../src/cron";

async function seed(nickname: string, lastActive: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(nickname, nickname.toLowerCase(), `recovery-${nickname}`, "2025-01-01T00:00:00.000Z", lastActive)
    .run();
  const id = (
    await env.DB.prepare("SELECT id FROM players WHERE nickname_key = ?")
      .bind(nickname.toLowerCase())
      .first<{ id: number }>()
  )?.id;
  await env.DB.prepare(
    "INSERT INTO tokens (hash, player_id, kind, created_at) VALUES (?, ?, 'main', '2025-01-01T00:00:00.000Z')",
  )
    .bind(`hash-${nickname}`, id)
    .run();
  await env.DB.prepare(
    "INSERT INTO events (player_id, kind, item_id, at, received) VALUES (?, 'task_passed', 't1', '2025-01-01', '2025-01-01')",
  )
    .bind(id)
    .run();
  await env.DB.prepare(
    "INSERT INTO saves (player_id, revision, blob, updated_at) VALUES (?, 1, 'blob', '2025-01-01T00:00:00.000Z')",
  )
    .bind(id)
    .run();
}

test("a player inactive for more than a year is deleted with their rows, a recent one stays", async () => {
  const today = "2026-10-15";
  await seed("Old", addDays(today, -366));
  await seed("Recent", addDays(today, -364));
  const removed = await deleteInactive(env, today);
  expect(removed).toBe(1);
  const left = await env.DB.prepare("SELECT nickname FROM players").all<{ nickname: string }>();
  expect(left.results.map((r) => r.nickname)).toEqual(["Recent"]);
  const oldTokens = await env.DB.prepare("SELECT count(*) AS n FROM tokens WHERE hash = 'hash-Old'").first<{
    n: number;
  }>();
  expect(oldTokens?.n).toBe(0);
  const recentTokens = await env.DB.prepare(
    "SELECT count(*) AS n FROM tokens WHERE hash = 'hash-Recent'",
  ).first<{ n: number }>();
  expect(recentTokens?.n).toBe(1);
});
