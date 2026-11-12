import { modelParams } from "../../src/tutor/models.ts";
import type { Env } from "./env";
import { LIMITS } from "./limits.ts";

// The chunk shape is not the same for every Workers AI model and the docs do not pin it
// down: older models send {"response":"..."} and OpenAI-style ones (Gemma 4 among them)
// send {"choices":[{"delta":{"content":"..."}}]}. Reasoning fields (reasoning,
// reasoning_content, delta.reasoning_content) are never read here, so the learner never
// sees the model's thinking. Checked against tools/tutor_eval results-*-raw.txt when the
// owner runs the bake-off.
export function textFromChunk(json: unknown): string {
  if (typeof json !== "object" || json === null) return "";
  const chunk = json as Record<string, unknown>;
  if (typeof chunk.response === "string") return chunk.response;
  const choices = chunk.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const delta = (choices[0] as { delta?: unknown }).delta;
    if (typeof delta === "object" && delta !== null) {
      const content = (delta as Record<string, unknown>).content;
      if (typeof content === "string") return content;
    }
  }
  return "";
}

function textsInLine(line: string): string[] {
  if (!line.startsWith("data:")) return [];
  const payload = line.slice(5).trim();
  if (payload === "[DONE]") return [];
  try {
    const text = textFromChunk(JSON.parse(payload));
    return text ? [text] : [];
  } catch {
    return []; // a data line that is not JSON: nothing to show
  }
}

// SSE bytes in (events can split across chunks), text pieces out.
export function textStream(sse: ReadableStream<Uint8Array>): ReadableStream<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  return sse.pipeThrough(
    new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        let lineEnd;
        while ((lineEnd = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
          buffer = buffer.slice(lineEnd + 1);
          for (const text of textsInLine(line)) controller.enqueue(text);
        }
      },
      flush(controller) {
        buffer += decoder.decode();
        if (buffer.length > 0) for (const text of textsInLine(buffer)) controller.enqueue(text);
      },
    }),
  );
}

// The live model call, wired in index.ts. The token cap parameter differs per model
// family (modelParams carries the verified mapping, and turns Gemma thinking off).
export async function askWorkersAi(
  env: Env,
  messages: { role: string; content: string }[],
): Promise<ReadableStream<string>> {
  const model = env.TUTOR_MODEL;
  // the generated Ai type only overloads the model ids known to the runtime; the API accepts any id.
  // bound: run reads private state from `this`, so called detached it throws before reaching the model
  const run = env.AI.run.bind(env.AI) as unknown as (
    model: string,
    inputs: Record<string, unknown>,
  ) => Promise<unknown>;
  const sse = (await run(model, {
    messages,
    stream: true,
    ...modelParams(model, LIMITS.maxOutputTokens),
  })) as ReadableStream<Uint8Array>;
  return textStream(sse);
}
