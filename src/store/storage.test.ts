import { expect, test, vi } from "vitest";
import { emptyProgress } from "../learning/types";
import { MAX_CODE_CHARS } from "../sync/events";
import {
  PACKED_BLOB_LIMIT,
  PACKED_PREFIX,
  STORAGE_KEY,
  exportProgress,
  importProgress,
  loadProgress,
  packSave,
  saveProgress,
  unpackSave,
  type StorageLike,
} from "./storage";

function memory(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

test("nothing saved yet gives empty, persistent progress", () => {
  expect(loadProgress(memory())).toEqual({ progress: emptyProgress(), persistent: true });
});

test("save then load round-trips", () => {
  const s = memory();
  const p = { ...emptyProgress(), xp: 42 };
  expect(saveProgress(s, p)).toBe(true);
  expect(loadProgress(s).progress.xp).toBe(42);
});

test("corrupted data loads empty and is kept under a backup key", () => {
  const s = memory({ [STORAGE_KEY]: "{not json" });
  expect(loadProgress(s).progress).toEqual(emptyProgress());
  expect(s.data[`${STORAGE_KEY}.corrupt`]).toBe("{not json");
});

test("data from an unknown future version is kept aside, not overwritten", () => {
  const future = JSON.stringify({ version: 99, xp: 5 });
  const s = memory({ [STORAGE_KEY]: future });
  expect(loadProgress(s).progress).toEqual(emptyProgress());
  expect(s.data[`${STORAGE_KEY}.corrupt`]).toBe(future);
});

test("missing fields are filled in (older saves keep working)", () => {
  const s = memory({ [STORAGE_KEY]: JSON.stringify({ version: 1, xp: 7 }) });
  expect(loadProgress(s).progress).toEqual({ ...emptyProgress(), xp: 7 });
});

test("storage that throws (private mode, quota) is not persistent and never crashes", () => {
  const broken: StorageLike = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  };
  expect(loadProgress(broken)).toEqual({ progress: emptyProgress(), persistent: false });
  expect(saveProgress(broken, emptyProgress())).toBe(false);
  expect(loadProgress(null).persistent).toBe(false);
});

test("export and import round-trip; bad files are refused", () => {
  const p = { ...emptyProgress(), xp: 99 };
  const back = importProgress(exportProgress(p));
  expect(back).toEqual({ ok: true, progress: p });
  expect(importProgress("hello").ok).toBe(false);
  expect(importProgress(JSON.stringify({ app: "other", progress: p })).ok).toBe(false);
  expect(
    importProgress(JSON.stringify({ app: "code-village", progress: { version: 1, xp: "lots" } })).ok,
  ).toBe(false);
});

test("a Plan 1 save (no review or boss records yet) loads intact with them empty", () => {
  const old = {
    version: 1,
    xp: 30,
    tasks: {},
    lessons: { lists: { passedAt: "2026-10-12" } },
    plants: {},
    drafts: {},
  };
  const s = memory({ [STORAGE_KEY]: JSON.stringify(old) });
  expect(loadProgress(s).progress).toEqual({ ...emptyProgress(), ...old });
});

test("a save whose boss records are damaged is set aside, not half-loaded", () => {
  const damaged = JSON.stringify({ version: 1, xp: 0, bosses: "lots" });
  const s = memory({ [STORAGE_KEY]: damaged });
  expect(loadProgress(s).progress).toEqual(emptyProgress());
  expect(s.data[`${STORAGE_KEY}.corrupt`]).toBe(damaged);
});

test("a small save travels as plain JSON", async () => {
  const p = { ...emptyProgress(), xp: 7, drafts: { a: "print(1)\n" } };
  const packed = await packSave(p);
  expect(packed.startsWith(PACKED_PREFIX)).toBe(false);
  expect(await unpackSave(packed)).toEqual({ ok: true, progress: p });
});

test("a fat save packs, cuts drafts to the event code cap, and unpacks", async () => {
  const drafts: Record<string, string> = {};
  for (let t = 0; t < 99; t++)
    drafts[`task-${t}`] = `# task ${t}\n${"print('hello, village')\n".repeat(280)}`;
  const p = { ...emptyProgress(), xp: 12, drafts };
  expect(exportProgress(p).length).toBeGreaterThan(PACKED_BLOB_LIMIT);
  const packed = await packSave(p);
  expect(packed.startsWith(PACKED_PREFIX)).toBe(true);
  expect(packed.length).toBeLessThanOrEqual(PACKED_BLOB_LIMIT);
  const back = await unpackSave(packed);
  expect(back.ok).toBe(true);
  if (back.ok) {
    expect(back.progress.xp).toBe(12);
    expect(back.progress.drafts["task-0"]).toHaveLength(MAX_CODE_CHARS);
    expect(back.progress.drafts["task-0"].startsWith("# task 0\n")).toBe(true);
  }
});

test("a plain blob written before packs still unpacks", async () => {
  const p = { ...emptyProgress(), xp: 7 };
  expect(await unpackSave(exportProgress(p))).toEqual({ ok: true, progress: p });
  expect((await unpackSave("hello")).ok).toBe(false);
});

test("an incompressible worst-case save drops the drafts and still fits", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const drafts: Record<string, string> = {};
  for (let t = 0; t < 99; t++) {
    const noise = crypto.getRandomValues(new Uint8Array(MAX_CODE_CHARS));
    let code = "";
    for (const byte of noise) code += String.fromCharCode(32 + (byte % 94));
    drafts[`task-${t}`] = code;
  }
  const packed = await packSave({ ...emptyProgress(), xp: 5, drafts });
  expect(packed.length).toBeLessThanOrEqual(PACKED_BLOB_LIMIT);
  const back = await unpackSave(packed);
  expect(back.ok).toBe(true);
  if (back.ok) {
    expect(back.progress.xp).toBe(5);
    expect(back.progress.drafts).toEqual({});
  }
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});
