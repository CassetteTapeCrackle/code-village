import type { Turn } from "./packet";

export const OFFLINE_MESSAGE = "The teacher needs a connection.";

export type StreamEvent =
  { kind: "text"; text: string } | { kind: "done" } | { kind: "error"; message: string };

export type AskOutcome =
  | { kind: "stream"; body: ReadableStream<Uint8Array> }
  | { kind: "error"; message: string }
  | { kind: "offline" };

function serverMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}

function eventOf(payload: string): StreamEvent | null {
  if (payload === "[DONE]") return null;
  try {
    const data: unknown = JSON.parse(payload);
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;
    if (typeof record.text === "string") return { kind: "text", text: record.text };
    if (record.done === true) return { kind: "done" };
    if (typeof record.error === "string") return { kind: "error", message: record.error };
  } catch {
    // a data line that is not JSON: skip it
  }
  return null;
}

// Never throws: the panel needs a plain message either way.
export async function askTutor(input: {
  taskId: string;
  message: string;
  recentTurns: Turn[];
  token: string;
}): Promise<AskOutcome> {
  try {
    const res = await fetch("/api/tutor", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${input.token}` },
      body: JSON.stringify({ taskId: input.taskId, message: input.message, recentTurns: input.recentTurns }),
    });
    if (!res.ok) {
      const data: unknown = await res.json().catch(() => null);
      return {
        kind: "error",
        message: serverMessage(data) ?? "The teacher could not answer just now. Try again in a moment.",
      };
    }
    if (!res.body)
      return { kind: "error", message: "The teacher could not answer just now. Try again in a moment." };
    return { kind: "stream", body: res.body };
  } catch {
    return { kind: "offline" };
  }
}

// data: lines can split across chunks; only whole lines are parsed.
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lineEnd;
      while ((lineEnd = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
        buffer = buffer.slice(lineEnd + 1);
        if (!line.startsWith("data:")) continue;
        const event = eventOf(line.slice(5).trim());
        if (event) yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
