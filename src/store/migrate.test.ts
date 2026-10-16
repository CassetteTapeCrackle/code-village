import { expect, test } from "vitest";
import { loadProgress } from "./storage";
import { migrateStorageKeys } from "./migrate";

type Store = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem"> & {
  data: Record<string, string>;
};

function memory(initial: Record<string, string> = {}): Store {
  const data = { ...initial };
  return {
    data,
    get length() {
      return Object.keys(data).length;
    },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

test("a returning player's progress survives the rename", () => {
  const s = memory({ "python-village/progress": JSON.stringify({ version: 1, xp: 42 }) });
  migrateStorageKeys(s);
  expect(loadProgress(s).progress.xp).toBe(42);
  expect(s.data["code-village/progress"]).toBeDefined();
  expect(s.data["python-village/progress"]).toBeUndefined();
});

test("a new key already present wins, and the old one is still dropped", () => {
  const s = memory({ "python-village/progress": "old", "code-village/progress": "new" });
  migrateStorageKeys(s);
  expect(s.data["code-village/progress"]).toBe("new");
  expect(s.data["python-village/progress"]).toBeUndefined();
});

test("every old key moves, whatever it holds", () => {
  const s = memory({
    "python-village/progress.corrupt": "{not json",
    "python-village/account": "a",
    "python-village/outbox-owner": "ada",
  });
  migrateStorageKeys(s);
  expect(s.data).toEqual({
    "code-village/progress.corrupt": "{not json",
    "code-village/account": "a",
    "code-village/outbox-owner": "ada",
  });
});

test("keys that are not the product's are left alone", () => {
  const s = memory({ "something-else": "x", "code-village/keep": "y" });
  migrateStorageKeys(s);
  expect(s.data).toEqual({ "something-else": "x", "code-village/keep": "y" });
});
