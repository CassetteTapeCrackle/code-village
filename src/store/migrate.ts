// The product was renamed from python-village to code-village. Every key an older build wrote
// (progress and its corrupt backup, the sound switch, the seen markers, the account, the sync
// outbox) shares one prefix, so one pass copies each old key to its new name and drops the old one.
type KeyedStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

const OLD_PREFIX = "python-village/";
const NEW_PREFIX = "code-village/";

export function migrateStorageKeys(storage: KeyedStorage): void {
  // back to front: removing a key shifts the ones after it
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (key === null || !key.startsWith(OLD_PREFIX)) continue;
    const value = storage.getItem(key);
    if (value === null) continue;
    const next = NEW_PREFIX + key.slice(OLD_PREFIX.length);
    if (storage.getItem(next) === null) storage.setItem(next, value);
    storage.removeItem(key);
  }
}

// Imported first in main.ts, so it runs before any module reads a key.
try {
  migrateStorageKeys(window.localStorage);
} catch {
  // private mode or a full store: there is nothing to migrate
}
