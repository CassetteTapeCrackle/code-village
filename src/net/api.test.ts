import { afterEach, expect, test, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());

test("the bearer header is set when a token is given", async () => {
  let seen: RequestInit | undefined;
  vi.stubGlobal("fetch", (_input: RequestInfo | URL, init?: RequestInit) => {
    seen = init;
    return Promise.resolve(
      new Response(JSON.stringify({ ok: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });
  const res = await api<{ ok: number }>("/api/me", { token: "tok-123" });
  expect(res).toEqual({ ok: true, data: { ok: 1 } });
  expect(new Headers(seen?.headers).get("authorization")).toBe("Bearer tok-123");
});

test("a thrown fetch becomes an offline result", async () => {
  vi.stubGlobal("fetch", () => Promise.reject(new Error("boom")));
  expect(await api("/api/me")).toEqual({ ok: false, status: 0, error: "You are offline." });
});

test("a JSON error body is surfaced as error", async () => {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response(JSON.stringify({ error: "That nickname is taken." }), { status: 409 })),
  );
  expect(await api("/api/register", { method: "POST", body: { nickname: "noa" } })).toEqual({
    ok: false,
    status: 409,
    error: "That nickname is taken.",
    data: { error: "That nickname is taken." },
  });
});
