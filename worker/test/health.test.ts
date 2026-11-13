import { env } from "cloudflare:workers";
import { expect, test, vi } from "vitest";
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

test("a route that throws answers 500 JSON and logs the failure without the query string", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const broken = {
      ...deps,
      now: () => {
        throw new TypeError("clock detached");
      },
    };
    const res = await handle(new Request("https://x/api/health?token=secret"), env, broken);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Something broke on our side. Try again in a minute.",
    });
    expect(logged).toHaveBeenCalledWith(
      "worker: request failed",
      "GET",
      "/api/health",
      expect.objectContaining({ message: "clock detached" }),
    );
  } finally {
    logged.mockRestore();
  }
});

test("one address gets 200 API calls a minute, then a 429; another address is unaffected", async () => {
  const from = (ip: string): Request =>
    new Request("https://x/api/health", { headers: { "cf-connecting-ip": ip } });
  for (let i = 0; i < 200; i++) expect((await handle(from("10.9.9.9"), env, deps)).status).toBe(200);
  const blocked = await handle(from("10.9.9.9"), env, deps);
  expect(blocked.status).toBe(429);
  expect(await blocked.json()).toEqual({
    error: "Too many requests from here. Wait a minute, then try again.",
  });
  expect((await handle(from("10.9.9.8"), env, deps)).status).toBe(200);
});

test("the schema is there", async () => {
  const row = await env.DB.prepare("SELECT count(*) AS n FROM players").first<{ n: number }>();
  expect(row?.n).toBe(0);
});
