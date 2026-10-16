import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { playerFor } from "../src/auth";
import { sha256Hex } from "../src/crypto";
import { LIMITS, takeIpSlot } from "../src/limits";

async function seedPlayer(nickname: string, token: string, kind: "main" | "agent" = "main"): Promise<number> {
  await env.DB.prepare(
    "INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(nickname, nickname.toLowerCase(), `recovery-${nickname}`, "2026-10-01T00:00:00.000Z", "2026-10-01")
    .run();
  const row = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = ?")
    .bind(nickname.toLowerCase())
    .first<{ id: number }>();
  if (!row) throw new Error("seedPlayer: insert did not land");
  await env.DB.prepare("INSERT INTO tokens (hash, player_id, kind, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), row.id, kind, "2026-10-01T00:00:00.000Z")
    .run();
  return row.id;
}

const withToken = (token?: string): Request =>
  new Request("https://x/api/me", {
    headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
  });

test("a bearer token finds the player and stamps last_active", async () => {
  const token = "tok-main-0123456789012345678901234567890123";
  const id = await seedPlayer("Maple", token);
  const player = await playerFor(withToken(token), env, "main", "2026-10-15");
  expect(player).toEqual({ id, nickname: "Maple", nicknameKey: "maple" });
  const row = await env.DB.prepare("SELECT last_active AS lastActive FROM players WHERE id = ?")
    .bind(id)
    .first<{ lastActive: string }>();
  expect(row?.lastActive).toBe("2026-10-15");
});

test("a wrong token, a missing header and an agent token used as main are all null", async () => {
  const token = "tok-agent-01234567890123456789012345678901";
  await seedPlayer("Cedar", token, "agent");
  expect(await playerFor(withToken("x".repeat(43)), env, "main", "2026-10-15")).toBe(null);
  expect(await playerFor(withToken(), env, "main", "2026-10-15")).toBe(null);
  expect(await playerFor(withToken(token), env, "main", "2026-10-15")).toBe(null);
});

test("a banned nickname is refused", async () => {
  const token = "tok-main-ban-012345678901234567890123456789";
  await seedPlayer("Sunny", token);
  await env.DB.prepare("INSERT INTO flags (key, value) VALUES (?, ?)").bind("ban:sunny", "1").run();
  expect(await playerFor(withToken(token), env, "main", "2026-10-15")).toBe(null);
});

test("the fourth register from one IP in a day is refused, a new day resets", async () => {
  for (let i = 1; i <= LIMITS.registerPerIpPerDay; i++) {
    expect(await takeIpSlot(env, "203.0.113.7", "register", "2026-10-10")).toBe(true);
  }
  expect(await takeIpSlot(env, "203.0.113.7", "register", "2026-10-10")).toBe(false);
  expect(await takeIpSlot(env, "203.0.113.7", "register", "2026-10-11")).toBe(true);
});

test("the ip_buckets table never contains the IP string", async () => {
  await takeIpSlot(env, "203.0.113.9", "recover", "2026-10-10");
  const rows = await env.DB.prepare("SELECT bucket FROM ip_buckets").all();
  expect(JSON.stringify(rows.results)).not.toContain("203.0.113.9");
});
