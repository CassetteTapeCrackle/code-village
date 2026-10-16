export type Account = { nickname: string; token: string; revision: number };

const KEY = "code-village/account";
type AccountStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function browserStorage(): AccountStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = browserStorage();

function loadAccount(): Account | null {
  if (!storage) return null;
  try {
    const text = storage.getItem(KEY);
    if (text === null) return null;
    const parsed: unknown = JSON.parse(text);
    if (
      !isRecord(parsed) ||
      typeof parsed.nickname !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.revision !== "number"
    )
      return null;
    return { nickname: parsed.nickname, token: parsed.token, revision: parsed.revision };
  } catch {
    return null;
  }
}

function saveAccount(value: Account | null): void {
  try {
    if (value) storage?.setItem(KEY, JSON.stringify(value));
    else storage?.removeItem(KEY);
  } catch {
    // the account just is not persistent this session
  }
}

export const account = $state<{ current: Account | null }>({ current: loadAccount() });

// sync clears its pending snapshot when the account goes away. account must not import sync
// (sync imports account), so sync registers a handler here instead.
let onSignOut: (() => void) | null = null;

export function onAccountSignOut(handler: () => void): void {
  onSignOut = handler;
}

export function signIn(a: Account): void {
  account.current = a;
  saveAccount(a);
}

export function signOut(): void {
  account.current = null;
  saveAccount(null);
  onSignOut?.();
}

export function setRevision(revision: number): void {
  if (!account.current) return;
  account.current = { ...account.current, revision };
  saveAccount(account.current);
}
