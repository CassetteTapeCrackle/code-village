import type { Progress } from "../learning/types";
import { api } from "../net/api";
import { diffEvents, eventsFromProgress, isSyncEvent, type SyncEvent } from "../sync/events";
import type { Snapshot } from "../tutor/packet";
import { account, onAccountSignOut, setRevision, signOut } from "./account.svelte";
import { game, update } from "./progress.svelte";
import { packSave, unpackSave } from "./storage";

const OUTBOX_KEY = "code-village/outbox";
const OWNER_KEY = "code-village/outbox-owner";
const FLUSH_DELAY_MS = 5000;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

type SyncResult = {
  accepted: number;
  rejected: { id: string; kind: string; reason: string }[];
  revision: number | null;
};

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = browserStorage();

function loadOutbox(): SyncEvent[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OUTBOX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSyncEvent) : [];
  } catch {
    return [];
  }
}

function loadOwner(): string | null {
  try {
    return storage?.getItem(OWNER_KEY) ?? null;
  } catch {
    return null;
  }
}

let outbox = loadOutbox();
let owner = loadOwner();
let timer: ReturnType<typeof setTimeout> | null = null;
// the next snapshot to send: overwritten on every Check, cleared once the server took it
let pendingSnapshot: Snapshot | null = null;

function saveOutbox(): void {
  try {
    storage?.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch {
    // the outbox stays in memory only
  }
}

function saveOwner(value: string): void {
  try {
    storage?.setItem(OWNER_KEY, value);
  } catch {
    // the owner just is not persistent this session
  }
}

// The outbox belongs to one nickname: the next player on a shared browser must not send the last
// player's events (task_passed carries their code draft).
function ensureOwner(): void {
  const current = account.current;
  if (!current) return;
  const key = current.nickname.toLowerCase();
  if (owner !== null && owner !== key) {
    outbox = [];
    pendingSnapshot = null; // the next player must not inherit the last player's code draft
    saveOutbox();
  }
  if (owner !== key) {
    owner = key;
    saveOwner(key);
  }
}

function schedule(): void {
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    void flushNow();
  }, FLUSH_DELAY_MS);
}

function enqueue(events: SyncEvent[]): void {
  ensureOwner();
  if (events.length === 0) return;
  outbox.push(...events);
  saveOutbox();
  schedule();
}

export function queueSync(before: Progress, after: Progress): void {
  if (!account.current) return;
  enqueue(diffEvents(before, after));
}

export function backfill(p: Progress): void {
  if (!account.current) return;
  enqueue(eventsFromProgress(p));
}

export function setSnapshot(snapshot: Snapshot): void {
  if (!account.current) return;
  pendingSnapshot = snapshot;
  schedule();
}

export const syncConflict = $state<{
  current: { revision: number; blob: string } | null;
  error: string | null;
}>({ current: null, error: null });

const EVENT_BATCH = 100; // the server takes 500 events per sync and 600 KB per body: chunks keep a huge backfill sendable
let flushing: Promise<"sent" | "offline" | "signed-out" | "conflict"> | null = null;

async function doFlush(): Promise<"sent" | "offline" | "signed-out" | "conflict"> {
  const current = account.current;
  if (!current) return "signed-out";
  ensureOwner();
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  const sentCount = outbox.length;
  const sentSnapshot = pendingSnapshot;
  const events = outbox.slice();
  const post = (body: object) => api<SyncResult>("/api/sync", { method: "POST", token: current.token, body });
  // the snapshot rides only the first try: if it caused the refusal, the retries must still land the milestones
  let res = await post({
    events,
    save: {
      baseRevision: current.revision,
      blob: await packSave($state.snapshot(game.progress) as Progress),
    },
    ...(sentSnapshot ? { snapshot: sentSnapshot } : {}),
  });
  if (!res.ok && (res.status === 400 || res.status === 413)) {
    // a size failure is permanent for the same payload: the milestones still deserve to land
    console.warn("sync refused the save, retrying the events alone", res.status, res.error);
    res = await post({ events });
  }
  if (!res.ok && (res.status === 400 || res.status === 413) && events.length > EVENT_BATCH) {
    console.warn("sync refused the whole batch, retrying in chunks", res.status, res.error);
    for (let i = 0; i < events.length; i += EVENT_BATCH) {
      res = await post({ events: events.slice(i, i + EVENT_BATCH) });
      if (!res.ok) break;
    }
  }
  if (!res.ok) {
    if (res.status === 0) return "offline";
    if (res.status === 401) {
      signOut();
      return "signed-out";
    }
    if (res.status === 409) {
      const data = res.data;
      if (isRecord(data) && typeof data.revision === "number" && typeof data.blob === "string")
        syncConflict.current = { revision: data.revision, blob: data.blob };
      syncConflict.error = null;
      return "conflict";
    }
    console.warn("sync failed, keeping the outbox", res.status, res.error);
    return "offline";
  }
  // a rejected event is not retried forever: it left the outbox with the accepted ones
  for (const rejected of res.data.rejected) console.warn("sync rejected", rejected);
  if (res.data.revision !== null) setRevision(res.data.revision);
  if (pendingSnapshot === sentSnapshot) pendingSnapshot = null; // a newer Check keeps its snapshot queued
  outbox = outbox.slice(sentCount);
  saveOutbox();
  return "sent";
}

export async function flushNow(): Promise<"sent" | "offline" | "signed-out" | "conflict"> {
  // one flush at a time: a third caller queued behind the same promise must not start its own
  while (flushing) await flushing.catch(() => undefined);
  const run = doFlush();
  flushing = run;
  try {
    return await run;
  } finally {
    if (flushing === run) flushing = null;
  }
}

export async function resolveConflict(keep: "device" | "cloud"): Promise<void> {
  const conflict = syncConflict.current;
  if (!conflict || !account.current) return;
  if (keep === "cloud") {
    const imported = await unpackSave(conflict.blob);
    if (!imported.ok) {
      // the blob cannot be read right now: keep the conflict up and say why
      syncConflict.error = imported.error;
      return;
    }
    update(() => imported.progress);
    setRevision(conflict.revision);
    syncConflict.current = null;
    syncConflict.error = null;
    return;
  }
  setRevision(conflict.revision);
  syncConflict.current = null;
  syncConflict.error = null;
  // the device's milestones win here too: anything never sent goes up with the flush
  backfill($state.snapshot(game.progress) as Progress);
  await flushNow();
}

// signing out drops the queued snapshot: it must not travel with the next account on this browser
onAccountSignOut(() => {
  pendingSnapshot = null;
});

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    if (account.current) void flushNow();
  });
}
