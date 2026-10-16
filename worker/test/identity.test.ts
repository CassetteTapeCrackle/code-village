import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { normalizeRecoveryCode, sha256Hex } from "../src/crypto";
import { handle } from "../src/router";

const okDeps = {
  verifyHuman: async () => true,
  now: () => new Date("2026-10-15T12:00:00Z"),
  askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
};
const noHumanDeps = {
  verifyHuman: async () => false,
  now: () => new Date("2026-10-15T12:00:00Z"),
  askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
};

function post(path: string, body: unknown, ip: string, token?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request(`https://x${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

function getMe(token?: string): Request {
  return new Request("https://x/api/me", { headers: token ? { authorization: `Bearer ${token}` } : {} });
}

type Registered = { nickname: string; token: string; recoveryCode: string };

async function registerPlayer(nickname: string, ip: string): Promise<{ res: Response; body: Registered }> {
  const res = await handle(post("/api/register", { nickname, turnstile: "t" }, ip), env, okDeps);
  return { res, body: (await res.json()) as Registered };
}

test("register returns a token and a recovery code, and stores only hashes", async () => {
  const { res, body } = await registerPlayer("Maple", "10.0.0.1");
  expect(res.status).toBe(201);
  expect(body.nickname).toBe("Maple");
  expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(body.recoveryCode).toMatch(/^([a-z]{3,7}-){4}\d{2}$/);
  const tokenRow = await env.DB.prepare("SELECT hash FROM tokens").first<{ hash: string }>();
  expect(tokenRow?.hash).toBe(await sha256Hex(body.token));
  const playerRow = await env.DB.prepare("SELECT recovery_hash AS recoveryHash FROM players").first<{
    recoveryHash: string;
  }>();
  expect(playerRow?.recoveryHash).toBe(await sha256Hex(normalizeRecoveryCode(body.recoveryCode)));
  const dump = await env.DB.prepare("SELECT * FROM tokens").all();
  expect(JSON.stringify(dump.results)).not.toContain(body.token);
});

test("a nickname that differs only by case is taken", async () => {
  expect((await registerPlayer("noa", "10.0.0.2")).res.status).toBe(201);
  const second = await handle(
    post("/api/register", { nickname: "NOA", turnstile: "t" }, "10.0.0.3"),
    env,
    okDeps,
  );
  expect(second.status).toBe(409);
  expect(await second.json()).toEqual({ error: "That nickname is taken." });
});

test("a nickname with a space, an emoji, 21 characters or two characters is refused", async () => {
  for (const nickname of [
    "ab",
    "a".repeat(21),
    "noa smith",
    "noa\ud83d\ude00",
    "<img src=x onerror=alert(1)>",
  ]) {
    const res = await handle(post("/api/register", { nickname, turnstile: "t" }, "10.0.0.4"), env, okDeps);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Use 3 to 20 letters, digits, - or _." });
  }
});

test("a failed human check is a 403", async () => {
  const res = await handle(
    post("/api/register", { nickname: "Fern", turnstile: "t" }, "10.0.0.5"),
    env,
    noHumanDeps,
  );
  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({ error: "The human check failed. Try again." });
});

test("the fourth new nickname from one IP in a day is refused", async () => {
  const statuses: number[] = [];
  for (const nickname of ["Alpha", "Beta", "Gamma", "Delta"]) {
    statuses.push((await registerPlayer(nickname, "10.0.0.9")).res.status);
  }
  expect(statuses).toEqual([201, 201, 201, 429]);
  const last = await handle(
    post("/api/register", { nickname: "Epsilon", turnstile: "t" }, "10.0.0.9"),
    env,
    okDeps,
  );
  expect(await last.json()).toEqual({ error: "Too many new nicknames from here today." });
});

test("recover accepts a code typed with capitals and spaces and rotates the token", async () => {
  const { body } = await registerPlayer("Otter", "10.0.0.20");
  const typed = body.recoveryCode.toUpperCase().split("-").join(" ");
  const res = await handle(
    post("/api/recover", { recoveryCode: typed, turnstile: "t" }, "10.0.0.20"),
    env,
    okDeps,
  );
  expect(res.status).toBe(200);
  const recovered = (await res.json()) as { nickname: string; token: string };
  expect(recovered.nickname).toBe("Otter");
  expect(recovered.token).not.toBe(body.token);
  expect((await handle(getMe(body.token), env, okDeps)).status).toBe(401);
  const me = await handle(getMe(recovered.token), env, okDeps);
  expect(me.status).toBe(200);
  expect(await me.json()).toEqual({ nickname: "Otter" });
});

test("a wrong recovery code is a 404", async () => {
  const res = await handle(
    post("/api/recover", { recoveryCode: "nope-nope-nope-nope-00", turnstile: "t" }, "10.0.0.21"),
    env,
    okDeps,
  );
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "No nickname has that recovery code." });
});

test("recovering revokes the agent token along with the main one", async () => {
  const { body } = await registerPlayer("Hazel", "10.0.0.70");
  await handle(
    new Request("https://x/api/agent-token", {
      method: "POST",
      headers: { authorization: `Bearer ${body.token}` },
    }),
    env,
    okDeps,
  );
  const id = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = 'hazel'").first<{
    id: number;
  }>();
  const count = (): Promise<{ n: number } | null> =>
    env.DB.prepare("SELECT COUNT(*) AS n FROM tokens WHERE player_id = ? AND kind = 'agent'")
      .bind(id?.id)
      .first<{ n: number }>();
  expect(await count()).toEqual({ n: 1 });
  const res = await handle(
    post("/api/recover", { recoveryCode: body.recoveryCode, turnstile: "t" }, "10.0.0.70"),
    env,
    okDeps,
  );
  expect(res.status).toBe(200);
  expect(await count()).toEqual({ n: 0 });
});

test("trying a taken nickname does not spend the IP's daily slots", async () => {
  await registerPlayer("SlotOwner", "10.0.0.50");
  for (let i = 0; i < 3; i++) {
    const res = await handle(
      post("/api/register", { nickname: "SLOTOWNER", turnstile: "t" }, "10.0.0.51"),
      env,
      okDeps,
    );
    expect(res.status).toBe(409);
  }
  // a fourth try from the same IP names a fresh nickname: the three refuses must not have used the slots
  const fresh = await handle(
    post("/api/register", { nickname: "Fresh", turnstile: "t" }, "10.0.0.51"),
    env,
    okDeps,
  );
  expect(fresh.status).toBe(201);
});

test("a banned nickname is refused at register, before any row is made", async () => {
  await env.DB.prepare("INSERT INTO flags (key, value) VALUES ('ban:ghost', '1')").run();
  const res = await handle(
    post("/api/register", { nickname: "Ghost", turnstile: "t" }, "10.0.0.60"),
    env,
    okDeps,
  );
  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({ error: "That nickname is not available." });
  const row = await env.DB.prepare("SELECT 1 FROM players WHERE nickname_key = 'ghost'").first();
  expect(row).toBeNull();
});

test("delete me removes every row of that player and leaves the other player alone", async () => {
  const pine = await registerPlayer("Pine", "10.0.0.30");
  await registerPlayer("Birch", "10.0.0.31");
  const pineId = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = 'pine'").first<{
    id: number;
  }>();
  const birchId = await env.DB.prepare("SELECT id FROM players WHERE nickname_key = 'birch'").first<{
    id: number;
  }>();
  expect(pineId?.id).toBeTruthy();
  await env.DB.prepare(
    "INSERT INTO events (player_id, kind, item_id, at, received, hints, code) VALUES (?, 'task_passed', 't1', '2026-10-15', '2026-10-15', 0, '')",
  )
    .bind(pineId?.id)
    .run();
  await env.DB.prepare(
    "INSERT INTO saves (player_id, revision, blob, updated_at) VALUES (?, 1, 'blob', '2026-10-15T00:00:00.000Z')",
  )
    .bind(pineId?.id)
    .run();
  await env.DB.prepare(
    "INSERT INTO snapshots (player_id, task_id, code, check_json, checks, hints, updated_at) VALUES (?, 't1', '', NULL, 0, 0, '2026-10-15T00:00:00.000Z')",
  )
    .bind(pineId?.id)
    .run();
  await env.DB.prepare(
    "INSERT INTO quota (player_id, day, replies, minute, minute_count) VALUES (?, '2026-10-15', 1, '2026-10-15T00:00', 1)",
  )
    .bind(pineId?.id)
    .run();
  const res = await handle(
    new Request("https://x/api/me", {
      method: "DELETE",
      headers: { authorization: `Bearer ${pine.body.token}` },
    }),
    env,
    okDeps,
  );
  expect(res.status).toBe(204);
  for (const [table, column] of [
    ["players", "id"],
    ["tokens", "player_id"],
    ["events", "player_id"],
    ["saves", "player_id"],
    ["snapshots", "player_id"],
    ["quota", "player_id"],
  ] as const) {
    const gone = await env.DB.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${column} = ?`)
      .bind(pineId?.id)
      .first<{ n: number }>();
    expect(gone?.n, table).toBe(0);
  }
  const kept = await env.DB.prepare("SELECT count(*) AS n FROM players WHERE id = ?")
    .bind(birchId?.id)
    .first<{ n: number }>();
  expect(kept?.n).toBe(1);
});
