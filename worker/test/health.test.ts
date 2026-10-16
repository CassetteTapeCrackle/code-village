import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { handle } from "../src/router";

const deps = {
  verifyHuman: async () => true,
  now: () => new Date("2026-10-15T12:00:00Z"),
  askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
};

test("health answers", async () => {
  const res = await handle(new Request("https://x/api/health"), env, deps);
  expect(await res.json()).toEqual({ ok: true, time: "2026-10-15T12:00:00.000Z" });
});

test("unknown API route is a 404 with a plain message", async () => {
  const res = await handle(new Request("https://x/api/nope"), env, deps);
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: "No such API route." });
});

test("the schema is there", async () => {
  const row = await env.DB.prepare("SELECT count(*) AS n FROM players").first<{ n: number }>();
  expect(row?.n).toBe(0);
});
