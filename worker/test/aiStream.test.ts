import { expect, test } from "vitest";
import { askWorkersAi, textFromChunk, textStream } from "../src/aiStream";
import type { Env } from "../src/env";

function fromChunks(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const chunk of chunks) c.enqueue(encoder.encode(chunk));
      c.close();
    },
  });
}

async function collect(stream: ReadableStream<string>): Promise<string[]> {
  const pieces: string[] = [];
  for await (const piece of stream) pieces.push(piece);
  return pieces;
}

test("textFromChunk reads the legacy response shape and the OpenAI delta shape", () => {
  expect(textFromChunk({ response: "old" })).toBe("old");
  expect(textFromChunk({ choices: [{ delta: { content: "new" } }] })).toBe("new");
  expect(textFromChunk({ choices: [] })).toBe("");
  expect(textFromChunk("junk")).toBe("");
  expect(textFromChunk(null)).toBe("");
});

test("reasoning fields never become reply text", () => {
  expect(textFromChunk({ response: "", reasoning: "thinking" })).toBe("");
  expect(textFromChunk({ choices: [{ delta: { reasoning_content: "thinking" } }] })).toBe("");
  expect(textFromChunk({ choices: [{ delta: { reasoning: "thinking" } }] })).toBe("");
});

test("the stream reads both shapes, skips [DONE], and reassembles a line split across chunks", async () => {
  const sse =
    'data: {"response":"old "}\n\n' +
    'data: {"choices":[{"delta":{"content":"new "}}]}\n\n' +
    'data: {"choices":[{"delta":{"reasoning_content":"secret"}}]}\n\n' +
    "data: [DONE]\n\n";
  const cut = sse.indexOf('"new "') + 4;
  const pieces = await collect(textStream(fromChunks(sse.slice(0, cut), sse.slice(cut))));
  expect(pieces).toEqual(["old ", "new "]);
});

// Like the real binding, run keeps state in a private field: called detached from env.AI it throws
// "Cannot set properties of undefined (setting '#options')", and every tutor reply came back busy.
class FakeAi {
  #last: { model: string; inputs: Record<string, unknown> } | null = null;

  get last(): { model: string; inputs: Record<string, unknown> } | null {
    return this.#last;
  }

  async run(model: string, inputs: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    this.#last = { model, inputs };
    return fromChunks('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n');
  }
}

test("askWorkersAi calls run on the binding itself, so a binding that relies on `this` answers", async () => {
  const ai = new FakeAi();
  const env = { AI: ai, TUTOR_MODEL: "@cf/google/gemma-4-26b-a4b-it" } as unknown as Env;
  const pieces = await collect(await askWorkersAi(env, [{ role: "user", content: "hello" }]));
  expect(pieces).toEqual(["hi"]);
  expect(ai.last).toMatchObject({ model: "@cf/google/gemma-4-26b-a4b-it", inputs: { stream: true } });
});
