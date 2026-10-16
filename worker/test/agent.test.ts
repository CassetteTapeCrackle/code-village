import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { sha256Hex } from "../src/crypto";
import { handle } from "../src/router";

const okDeps = { verifyHuman: async () => true, now: () => new Date("2026-10-15T12:00:00Z") };
const SIGNOUT = "Sign in again: this device is not registered.";

async function registerPlayer(nickname: string, ip: string): Promise<string> {
  const res = await handle(
    new Request("https://x/api/register", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify({ nickname, turnstile: "t" }),
    }),
    env,
    okDeps,
  );
  const body = (await res.json()) as { token: string };
  return body.token;
}

function agentRequest(method: string, token?: string): Request {
  return new Request("https://x/api/agent-token", {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function playerId(nickname: string): Promise<number> {
  const row = await env.DB.prepare("SELECT id FROM players WHERE nickname = ?")
    .bind(nickname)
    .first<{ id: number }>();
  if (!row) throw new Error(`player ${nickname} is missing`);
  return row.id;
}

async function makeAgentToken(main: string): Promise<string> {
  const res = await handle(agentRequest("POST", main), env, okDeps);
  expect(res.status).toBe(201);
  return ((await res.json()) as { token: string }).token;
}

test("making an agent token returns a token and stores only its hash as kind agent", async () => {
  const main = await registerPlayer("Maple", "10.1.0.1");
  const id = await playerId("Maple");
  const token = await makeAgentToken(main);
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const row = await env.DB.prepare("SELECT hash, kind FROM tokens WHERE kind = 'agent' AND player_id = ?")
    .bind(id)
    .first<{ hash: string; kind: string }>();
  expect(row?.hash).toBe(await sha256Hex(token));
  const dump = await env.DB.prepare("SELECT * FROM tokens WHERE kind = 'agent' AND player_id = ?")
    .bind(id)
    .all();
  expect(JSON.stringify(dump.results)).not.toContain(token);
});

test("a second make replaces the first token: one agent row per learner", async () => {
  const main = await registerPlayer("Otter", "10.1.0.2");
  const id = await playerId("Otter");
  const first = await makeAgentToken(main);
  const second = await makeAgentToken(main);
  expect(second).not.toBe(first);
  const rows = await env.DB.prepare("SELECT hash FROM tokens WHERE kind = 'agent' AND player_id = ?")
    .bind(id)
    .all<{ hash: string }>();
  expect(rows.results).toEqual([{ hash: await sha256Hex(second) }]);
});

test("two makes in the same instant leave exactly one agent token", async () => {
  const main = await registerPlayer("Twof", "10.1.0.6");
  const id = await playerId("Twof");
  await Promise.all([
    handle(agentRequest("POST", main), env, okDeps),
    handle(agentRequest("POST", main), env, okDeps),
  ]);
  const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM tokens WHERE kind = 'agent' AND player_id = ?")
    .bind(id)
    .first<{ n: number }>();
  expect(rows).toEqual({ n: 1 });
});

test("the make response carries the server's createdAt for the new token", async () => {
  const main = await registerPlayer("Wisp", "10.1.0.7");
  const res = await handle(agentRequest("POST", main), env, okDeps);
  expect(res.status).toBe(201);
  const body = (await res.json()) as { token: string; createdAt: string };
  expect(body.createdAt).toBe("2026-10-15T12:00:00.000Z");
  const row = await env.DB.prepare(
    "SELECT created_at AS createdAt FROM tokens WHERE kind = 'agent' AND player_id = ?",
  )
    .bind(await playerId("Wisp"))
    .first<{ createdAt: string }>();
  expect(row?.createdAt).toBe(body.createdAt);
});

test("revoking deletes the agent token and is safe to repeat", async () => {
  const main = await registerPlayer("Fern", "10.1.0.3");
  const id = await playerId("Fern");
  await makeAgentToken(main);
  const first = await handle(agentRequest("DELETE", main), env, okDeps);
  expect(first.status).toBe(204);
  expect(
    await env.DB.prepare("SELECT COUNT(*) AS n FROM tokens WHERE kind = 'agent' AND player_id = ?")
      .bind(id)
      .first<{ n: number }>(),
  ).toEqual({ n: 0 });
  const again = await handle(agentRequest("DELETE", main), env, okDeps);
  expect(again.status).toBe(204);
});

test("the status route reports whether a token exists and never returns the token", async () => {
  const main = await registerPlayer("Pine", "10.1.0.4");
  const before = await handle(agentRequest("GET", main), env, okDeps);
  expect(before.status).toBe(200);
  expect(await before.json()).toEqual({ exists: false, createdAt: null });
  const token = await makeAgentToken(main);
  const after = await handle(agentRequest("GET", main), env, okDeps);
  expect(after.status).toBe(200);
  const body = (await after.json()) as { exists: boolean; createdAt: string | null };
  expect(body.exists).toBe(true);
  expect(body.createdAt).toBe("2026-10-15T12:00:00.000Z");
  expect(JSON.stringify(body)).not.toContain(token);
  expect(Object.keys(body).sort()).toEqual(["createdAt", "exists"]);
});

test("an agent token is refused on the main-token routes", async () => {
  const main = await registerPlayer("Birch", "10.1.0.5");
  const agent = await makeAgentToken(main);
  const sync = await handle(
    new Request("https://x/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${agent}` },
      body: JSON.stringify({ events: [] }),
    }),
    env,
    okDeps,
  );
  expect(sync.status).toBe(401);
  expect(await sync.json()).toEqual({ error: SIGNOUT });
  for (const [method, path] of [
    ["GET", "/api/save"],
    ["GET", "/api/me"],
    ["DELETE", "/api/me"],
  ] as const) {
    const res = await handle(
      new Request(`https://x${path}`, { method, headers: { authorization: `Bearer ${agent}` } }),
      env,
      okDeps,
    );
    expect(res.status, `${method} ${path}`).toBe(401);
  }
});

test("the agent token routes need a main token", async () => {
  for (const method of ["GET", "POST", "DELETE"]) {
    const res = await handle(agentRequest(method), env, okDeps);
    expect(res.status).toBe(401);
  }
});
