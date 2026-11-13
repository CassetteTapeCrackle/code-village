import { env } from "cloudflare:workers";
import { expect, test, vi } from "vitest";
import { addDays } from "../../src/learning/dates";
import { recoveryHash, sha256Hex } from "../src/crypto";
import { deleteInactive, runNightly, wrapLegacyRecoveryHashes } from "../src/cron";

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

test("the cron wraps plain recovery hashes with the key and leaves wrapped ones alone", async () => {
  const code = "maple-otter-brick-lantern-42";
  const wrapped = await recoveryHash(env.RECOVERY_KEY, "other-code-words-here-07");
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES ('Plain', 'plain', ?, '2026-10-01', '2026-10-01')",
    ).bind(await sha256Hex(code)),
    env.DB.prepare(
      "INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES ('Wrapped', 'wrapped', ?, '2026-10-01', '2026-10-01')",
    ).bind(wrapped),
  ]);
  // earlier tests in this file leave players behind: every row without the prefix gets wrapped
  const plainRows = await env.DB.prepare(
    "SELECT count(*) AS n FROM players WHERE recovery_hash NOT LIKE 'v2:%'",
  ).first<{ n: number }>();
  expect(plainRows?.n).toBeGreaterThan(0);
  expect(await wrapLegacyRecoveryHashes(env)).toBe(plainRows?.n);
  const rows = await env.DB.prepare(
    "SELECT nickname, recovery_hash AS hash FROM players WHERE nickname IN ('Plain', 'Wrapped') ORDER BY nickname",
  ).all<{
    nickname: string;
    hash: string;
  }>();
  expect(rows.results).toEqual([
    { nickname: "Plain", hash: await recoveryHash(env.RECOVERY_KEY, code) },
    { nickname: "Wrapped", hash: wrapped },
  ]);
  expect(await wrapLegacyRecoveryHashes(env)).toBe(0);
});

test("the nightly run logs how many players it deleted and hashes it wrapped", async () => {
  // empty tables, so the counts do not depend on what earlier tests left behind
  await env.DB.batch([
    env.DB.prepare("DELETE FROM tokens"),
    env.DB.prepare("DELETE FROM events"),
    env.DB.prepare("DELETE FROM saves"),
    env.DB.prepare("DELETE FROM players"),
  ]);
  await seed("NightlyOld", "2025-01-01");
  await seed("NightlyFresh", "2026-10-01");
  await wrapLegacyRecoveryHashes(env); // every row wrapped, so only the deletion count is non-zero
  const logged = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await runNightly(env, new Date("2026-10-15T00:00:00Z"));
    expect(logged).toHaveBeenCalledWith("cron: nightly done", {
      deletedPlayers: 1,
      wrappedHashes: 0,
    });
  } finally {
    logged.mockRestore();
  }
});

test("the scheduled handler runs the nightly job and keeps it alive with waitUntil", async () => {
  const logged = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const waits: Promise<unknown>[] = [];
    const handler = (await import("../src/index")).default;
    handler.scheduled({} as ScheduledController, env, {
      waitUntil: (work: Promise<unknown>) => waits.push(work),
    } as unknown as ExecutionContext);
    expect(waits).toHaveLength(1);
    await waits[0];
    expect(logged).toHaveBeenCalledWith("cron: nightly done", {
      deletedPlayers: expect.any(Number),
      wrappedHashes: expect.any(Number),
    });
  } finally {
    logged.mockRestore();
  }
});
