import { expect, test } from "vitest";
import { textFromChunk, textStream } from "../src/aiStream";

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
