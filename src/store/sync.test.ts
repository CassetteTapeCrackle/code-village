import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { emptyProgress, type Progress } from "../learning/types";
import { account, signIn, signOut } from "./account.svelte";
import { game, update } from "./progress.svelte";
import { exportProgress } from "./storage";
import { backfill, flushNow, queueSync, resolveConflict, setSnapshot, syncConflict } from "./sync.svelte";

function withPassed(...ids: string[]): Progress {
  const p = emptyProgress();
  for (const id of ids) p.tasks[id] = { passedAt: "2026-10-15", hintsUsed: 0, checks: 0, xpEarned: 0 };
  return p;
}

const okSync = (): Response =>
  new Response(JSON.stringify({ accepted: 0, rejected: [], revision: 1 }), { status: 200 });

function stubFetch(
  handler: (call: { url: string; init: RequestInit }) => Response | Promise<Response>,
): { url: string; init: RequestInit }[] {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return Promise.resolve(handler(call));
  });
  return calls;
}

const sentEvents = (call: { init: RequestInit }): { id: string }[] =>
  (JSON.parse(String(call.init.body)) as { events: { id: string }[] }).events;

const sentSnapshot = (call: { init: RequestInit }): unknown =>
  (JSON.parse(String(call.init.body)) as { snapshot?: unknown }).snapshot;

const SNAP = { taskId: "t", code: "secret draft", check: null, checks: 0, hints: 0 };

const storedOutbox = (): unknown => JSON.parse(localStorage.getItem("code-village/outbox") ?? "[]");

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  syncConflict.current = null;
  syncConflict.error = null;
});

afterEach(() => {
  signOut();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("signed out, nothing is queued", async () => {
  const calls = stubFetch(() => okSync());
  queueSync(emptyProgress(), withPassed("t-one"));
  await vi.advanceTimersByTimeAsync(6000);
  expect(calls).toHaveLength(0);
  expect(await flushNow()).toBe("signed-out");
});

test("three quick changes produce one request after five seconds with all their events", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  const calls = stubFetch(() => okSync());
  const one = withPassed("t-one");
  const two = withPassed("t-one", "t-two");
  const three = withPassed("t-one", "t-two", "t-three");
  queueSync(emptyProgress(), one);
  queueSync(one, two);
  queueSync(two, three);
  await vi.advanceTimersByTimeAsync(4999);
  expect(calls).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(2);
  expect(calls).toHaveLength(1);
  expect(
    sentEvents(calls[0])
      .map((e) => e.id)
      .sort(),
  ).toEqual(["t-one", "t-three", "t-two"]);
  expect(storedOutbox()).toEqual([]);
});

test("offline keeps the outbox and a later online event sends it once", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  let online = false;
  const calls = stubFetch(() => {
    if (!online) throw new Error("offline");
    return okSync();
  });
  queueSync(emptyProgress(), withPassed("t-one"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(calls).toHaveLength(1);
  expect(await flushNow(), "still offline").toBe("offline");
  online = true;
  window.dispatchEvent(new Event("online"));
  await vi.advanceTimersByTimeAsync(0);
  expect(calls).toHaveLength(3);
  expect(sentEvents(calls[2])).toHaveLength(1);
  expect(storedOutbox()).toEqual([]);
});

test("a 409 sets syncConflict and the cloud choice replaces the progress", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 1 });
  const cloud = withPassed("t-cloud");
  cloud.xp = 55;
  const blob = exportProgress(cloud);
  let syncCalls = 0;
  const calls = stubFetch((call) => {
    if (call.url !== "/api/sync") return okSync();
    syncCalls += 1;
    return syncCalls === 1
      ? new Response(JSON.stringify({ error: "The cloud has a newer save.", revision: 7, blob }), {
          status: 409,
        })
      : okSync();
  });
  queueSync(emptyProgress(), withPassed("t-local"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(calls).toHaveLength(1);
  expect(syncConflict.current).toEqual({ revision: 7, blob });
  await resolveConflict("cloud");
  expect(syncConflict.current).toBe(null);
  expect(account.current?.revision).toBe(7);
  expect(game.progress.xp).toBe(55);
  await vi.advanceTimersByTimeAsync(5000);
  expect(storedOutbox()).toEqual([]);
});

test("a 401 signs out", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  stubFetch(() => new Response(JSON.stringify({ error: "nope" }), { status: 401 }));
  queueSync(emptyProgress(), withPassed("t-one"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(account.current).toBe(null);
});

test("a different nickname on the same browser does not send the previous player's events", async () => {
  let online = false;
  const calls = stubFetch(() => {
    if (!online) throw new Error("offline");
    return okSync();
  });
  signIn({ nickname: "Ada", token: "tok-a", revision: 0 });
  queueSync(emptyProgress(), withPassed("t-ada"));
  await vi.advanceTimersByTimeAsync(5000);
  online = true;
  signIn({ nickname: "Bob", token: "tok-b", revision: 0 });
  queueSync(emptyProgress(), withPassed("t-bob"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(sentEvents(calls[calls.length - 1]).map((e) => e.id)).toEqual(["t-bob"]);
});

test("keeping this device after a conflict backfills the milestones it never sent", async () => {
  update(() => withPassed("t-device")); // before signing in: nothing is queued
  signIn({ nickname: "Ada", token: "tok", revision: 1 });
  syncConflict.current = { revision: 7, blob: "{}" };
  const calls = stubFetch(() => okSync());
  await resolveConflict("device");
  expect(calls).toHaveLength(1);
  expect(sentEvents(calls[0]).map((e) => e.id)).toContain("t-device");
});

test("a refused save retries the events alone and warns", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  let first = true;
  const calls = stubFetch(() => {
    if (first) {
      first = false;
      return new Response(JSON.stringify({ error: "That save is too big." }), { status: 413 });
    }
    return okSync();
  });
  queueSync(emptyProgress(), withPassed("t-one"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(calls).toHaveLength(2);
  expect((JSON.parse(String(calls[1].init.body)) as { save?: unknown }).save).toBeUndefined();
  expect(sentEvents(calls[1]).map((e) => e.id)).toEqual(["t-one"]);
  expect(storedOutbox()).toEqual([]);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

test("a batch too big for one body is retried in chunks", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  let refusals = 2;
  const calls = stubFetch(() =>
    refusals-- > 0
      ? new Response(JSON.stringify({ error: "That request is too big." }), { status: 413 })
      : okSync(),
  );
  backfill(withPassed(...Array.from({ length: 101 }, (_, i) => `t-${i}`)));
  await vi.advanceTimersByTimeAsync(5000);
  expect(calls).toHaveLength(4);
  expect(sentEvents(calls[2])).toHaveLength(100);
  expect(sentEvents(calls[3])).toHaveLength(1);
  expect(storedOutbox()).toEqual([]);
  warn.mockRestore();
});

test("overlapping flushes are serialized into one request at a time", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  let inFlight = 0;
  let maxInFlight = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const calls = stubFetch(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await gate;
    inFlight -= 1;
    return okSync();
  });
  queueSync(emptyProgress(), withPassed("t-one"));
  const first = flushNow();
  const second = flushNow();
  release();
  expect(await Promise.all([first, second])).toEqual(["sent", "sent"]);
  expect(maxInFlight).toBe(1);
  expect(calls).toHaveLength(2);
});

test("a cloud blob that cannot be read keeps the conflict and surfaces the reason", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 1 });
  syncConflict.current = { revision: 7, blob: "not json" };
  await resolveConflict("cloud");
  expect(syncConflict.current).toEqual({ revision: 7, blob: "not json" });
  expect(syncConflict.error).toBe("This file is not a Code Village save.");
});

test("a snapshot queued by one player never rides the next player's save", async () => {
  signIn({ nickname: "Ada", token: "tok-a", revision: 0 });
  queueSync(emptyProgress(), withPassed("t-ada"));
  setSnapshot(SNAP);
  signIn({ nickname: "Bob", token: "tok-b", revision: 0 });
  const calls = stubFetch(() => okSync());
  queueSync(emptyProgress(), withPassed("t-bob"));
  await vi.advanceTimersByTimeAsync(5000);
  const last = calls[calls.length - 1];
  expect(sentEvents(last).map((e) => e.id)).toEqual(["t-bob"]);
  expect(sentSnapshot(last)).toBeUndefined();
});

test("signing out drops the queued snapshot before the same player returns", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  queueSync(emptyProgress(), withPassed("t-one"));
  setSnapshot(SNAP);
  signOut();
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  const calls = stubFetch(() => okSync());
  queueSync(emptyProgress(), withPassed("t-two"));
  await vi.advanceTimersByTimeAsync(5000);
  expect(sentSnapshot(calls[calls.length - 1])).toBeUndefined();
});

test("three overlapping flushes still run one request at a time", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  let inFlight = 0;
  let maxInFlight = 0;
  const release = { run: () => {} };
  const gate = new Promise<void>((resolve) => (release.run = resolve));
  stubFetch(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await gate;
    inFlight -= 1;
    return okSync();
  });
  queueSync(emptyProgress(), withPassed("t-one"));
  const first = flushNow();
  const second = flushNow();
  const third = flushNow();
  release.run();
  expect(await Promise.all([first, second, third])).toEqual(["sent", "sent", "sent"]);
  expect(maxInFlight).toBe(1);
});
