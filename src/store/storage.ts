import { emptyProgress, type Progress } from "../learning/types";
import { MAX_CODE_CHARS } from "../sync/events";

export const STORAGE_KEY = "code-village/progress";
export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type Loaded = { progress: Progress; persistent: boolean };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// One entry per old version: migrations[n] turns a version-n save into version n + 1.
const migrations: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

function fromSaved(raw: unknown): Progress | null {
  if (!isRecord(raw) || typeof raw.version !== "number") return null;
  let data = raw;
  while (typeof data.version === "number" && data.version < 1 && migrations[data.version])
    data = migrations[data.version](data);
  if (data.version !== 1) return null;
  const merged = { ...emptyProgress(), ...data } as Progress;
  const shapeOk =
    typeof merged.xp === "number" &&
    [merged.tasks, merged.lessons, merged.plants, merged.drafts, merged.reviewLast, merged.bosses].every(
      isRecord,
    );
  return shapeOk ? merged : null;
}

export function loadProgress(storage: StorageLike | null): Loaded {
  if (!storage) return { progress: emptyProgress(), persistent: false };
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return { progress: emptyProgress(), persistent: false };
  }
  if (text === null) return { progress: emptyProgress(), persistent: true };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const progress = fromSaved(parsed);
  if (progress) return { progress, persistent: true };
  try {
    storage.setItem(`${STORAGE_KEY}.corrupt`, text); // never lose what was there
  } catch {
    // nothing more we can do
  }
  return { progress: emptyProgress(), persistent: true };
}

export function saveProgress(storage: StorageLike | null, progress: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify({ app: "code-village", exportedAt: new Date().toISOString(), progress }, null, 1);
}

export function importProgress(
  text: string,
): { ok: true; progress: Progress } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not a Code Village save." };
  }
  if (!isRecord(parsed) || parsed.app !== "code-village")
    return { ok: false, error: "This file is not a Code Village save." };
  const progress = fromSaved(parsed.progress);
  return progress
    ? { ok: true, progress }
    : { ok: false, error: "This save is damaged or from a newer version." };
}

// A cloud save travels packed: drafts cut to the same 6000 chars the event stream already caps code
// at, gzipped, base64, behind a marker. The server caps a blob at 500 KB (worker/src/limits.ts);
// when even the packed form cannot fit, the drafts stay on this device, never the milestones.
export const PACKED_PREFIX = "packed1:";
export const PACKED_BLOB_LIMIT = 490_000;

async function gzipToBase64(text: string): Promise<string | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new CompressionStream("gzip");
    const writer = stream.writable.getWriter();
    void writer.write(new TextEncoder().encode(text));
    void writer.close();
    const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return PACKED_PREFIX + btoa(binary);
  } catch {
    return null;
  }
}

async function gunzipFromBase64(text: string): Promise<string | null> {
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    void writer.write(bytes);
    void writer.close();
    return await new Response(stream.readable).text();
  } catch {
    return null;
  }
}

export async function packSave(progress: Progress): Promise<string> {
  const trimmed: Progress = {
    ...progress,
    drafts: Object.fromEntries(
      Object.entries(progress.drafts).map(([id, code]) => [id, code.slice(0, MAX_CODE_CHARS)]),
    ),
  };
  const json = exportProgress(trimmed);
  // the common save travels as plain JSON: compressing is only for saves that would not fit
  if (json.length <= PACKED_BLOB_LIMIT) return json;
  const compressed = await gzipToBase64(json);
  if (compressed !== null && compressed.length <= PACKED_BLOB_LIMIT) return compressed;
  console.warn("the save is too big to carry drafts to the cloud; this upload leaves them on this device");
  const noDrafts = exportProgress({ ...trimmed, drafts: {} });
  return (await gzipToBase64(noDrafts)) ?? noDrafts;
}

export async function unpackSave(
  text: string,
): Promise<{ ok: true; progress: Progress } | { ok: false; error: string }> {
  if (!text.startsWith(PACKED_PREFIX)) return importProgress(text);
  const inner = await gunzipFromBase64(text.slice(PACKED_PREFIX.length));
  if (inner === null) return { ok: false, error: "This save is damaged or from a newer version." };
  return importProgress(inner);
}
