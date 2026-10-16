import { afterEach, expect, test, vi } from "vitest";
import { askTutor, OFFLINE_MESSAGE, readEvents, type StreamEvent } from "./stream";

function fromChunks(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(encoder.encode(chunk));
      c.close();
    },
  });
}

async function events(...chunks: string[]): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const event of readEvents(fromChunks(...chunks))) out.push(event);
  return out;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test("a data line cut across two chunks is parsed once it completes", async () => {
  const full = 'data: {"text":"Bonjour"}\n\ndata: {"done":true}\n\n';
  const cut = 20;
  expect(await events(full.slice(0, cut), full.slice(cut))).toEqual([
    { kind: "text", text: "Bonjour" },
    { kind: "done" },
  ]);
});

test("error events arrive, junk lines and [DONE] are ignored", async () => {
  expect(
    await events(
      'data: {"error":"The teacher is resting until tomorrow."}\n\n',
      "data: not json\n\n",
      ": a comment line\n\n",
      "data: [DONE]\n\n",
      "\n\n",
    ),
  ).toEqual([{ kind: "error", message: "The teacher is resting until tomorrow." }]);
});

test("askTutor posts the token and turns, and surfaces the server's message", async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  vi.stubGlobal("fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    seen.url = String(url);
    seen.init = init ?? {};
    return new Response(JSON.stringify({ error: "You used your 25 questions for today.", reason: "quota" }), {
      status: 429,
    });
  });
  const outcome = await askTutor({
    taskId: "values-total-price",
    message: "Why?",
    recentTurns: [{ role: "learner", text: "first" }],
    token: "tok",
  });
  expect(outcome).toEqual({ kind: "error", message: "You used your 25 questions for today." });
  expect(seen.url).toBe("/api/tutor");
  expect(new Headers(seen.init?.headers).get("authorization")).toBe("Bearer tok");
  expect(JSON.parse(String(seen.init?.body))).toEqual({
    taskId: "values-total-price",
    message: "Why?",
    recentTurns: [{ role: "learner", text: "first" }],
  });
});

test("askTutor is offline when the fetch itself fails", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new Error("network down");
  });
  expect(await askTutor({ taskId: "t", message: "m", recentTurns: [], token: "tok" })).toEqual({
    kind: "offline",
  });
});

test("the offline message tells the learner what is wrong", () => {
  expect(OFFLINE_MESSAGE).toBe("The teacher needs a connection.");
});
