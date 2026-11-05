import { bundle } from "../../../src/content/bundle";
import type { CheckResult } from "../../../src/runner/protocol";
import { isSyncEvent, type SyncEvent } from "../../../src/sync/events";
import { replay } from "../../../src/sync/plausible";
import { CAPS, type Snapshot } from "../../../src/tutor/packet";
import { playerFor } from "../auth";
import type { Deps, Env } from "../env";
import { fail, json, readBody } from "../http";
import { LIMITS } from "../limits";

const SIGNOUT = "Sign in again: this device is not registered.";

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

export function knownTask(taskId: string): boolean {
  return bundle.lessons.some((lesson) =>
    lesson.blocks.some(
      (block) =>
        block.type === "task" &&
        (block.task.id === taskId || block.task.variants.some((v) => v.id === taskId)),
    ),
  );
}

function isCheckResult(value: unknown): value is CheckResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const check = value as Record<string, unknown>;
  if (check.error !== null && typeof check.error !== "string") return false;
  if (!Array.isArray(check.results)) return false;
  return check.results.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const test = item as Record<string, unknown>;
    return (
      typeof test.name === "string" && typeof test.passed === "boolean" && typeof test.message === "string"
    );
  });
}

// The snapshot is the learner's own data for the tutor and agents, but it crosses a trust
// boundary: shapes are checked here, the code is cut to the shared cap, and the task has
// to exist in the bundle.
function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.taskId === "string" &&
    knownTask(s.taskId) &&
    typeof s.code === "string" &&
    (s.check === null || isCheckResult(s.check)) &&
    typeof s.checks === "number" &&
    Number.isInteger(s.checks) &&
    s.checks >= 0 &&
    typeof s.hints === "number" &&
    Number.isInteger(s.hints) &&
    s.hints >= 0
  );
}

export type EventRow = { kind: string; id: string; at: string; hints: number | null; code: string | null };

export function rowToEvent(row: EventRow): SyncEvent | null {
  const candidate =
    row.kind === "task_passed"
      ? { kind: row.kind, id: row.id, at: row.at, hints: row.hints ?? 0, code: row.code ?? "" }
      : { kind: row.kind, id: row.id, at: row.at };
  return isSyncEvent(candidate) ? candidate : null;
}

export async function sync(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, SIGNOUT);
  const body = await readBody(request, LIMITS.maxBodyBytes);
  if (body instanceof Response) return body;
  const { events, save, snapshot } = (body ?? {}) as {
    events?: unknown;
    save?: { baseRevision?: unknown; blob?: unknown };
    snapshot?: unknown;
  };
  if (!Array.isArray(events)) return fail(400, "Some events are not valid.");
  if (events.length > LIMITS.maxEventsPerSync) return fail(413, "Too many events in one sync.");
  if (!events.every(isSyncEvent)) return fail(400, "Some events are not valid.");
  let snapshotToStore: Snapshot | null = null;
  if (snapshot !== undefined) {
    if (!isSnapshot(snapshot)) return fail(400, "That snapshot is not valid.");
    snapshotToStore = snapshot;
  }

  const stored = await env.DB.prepare(
    "SELECT kind, item_id AS id, at, hints, code FROM events WHERE player_id = ?",
  )
    .bind(player.id)
    .all<EventRow>();
  const storedEvents = stored.results.map(rowToEvent).filter((e): e is SyncEvent => e !== null);
  const verdicts = replay(bundle, storedEvents, events);
  const day = dayOf(deps.now());
  const inserts = verdicts
    .filter((v) => v.ok)
    .map((v) =>
      env.DB.prepare(
        "INSERT OR IGNORE INTO events (player_id, kind, item_id, at, received, hints, code) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        player.id,
        v.event.kind,
        v.event.id,
        v.event.at,
        day,
        v.event.kind === "task_passed" ? v.event.hints : null,
        v.event.kind === "task_passed" ? v.event.code : null,
      ),
    );
  if (inserts.length) await env.DB.batch(inserts);

  if (snapshotToStore) {
    await env.DB.prepare(
      `INSERT INTO snapshots (player_id, task_id, code, check_json, checks, hints, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET task_id = excluded.task_id, code = excluded.code, check_json = excluded.check_json, checks = excluded.checks, hints = excluded.hints, updated_at = excluded.updated_at`,
    )
      .bind(
        player.id,
        snapshotToStore.taskId,
        snapshotToStore.code.slice(0, CAPS.code),
        snapshotToStore.check === null ? null : JSON.stringify(snapshotToStore.check),
        snapshotToStore.checks,
        snapshotToStore.hints,
        deps.now().toISOString(),
      )
      .run();
  }

  let revision: number | null = null;
  if (save !== undefined) {
    if (save === null || typeof save !== "object") return fail(400, "That save is not valid.");
    const { baseRevision, blob } = save;
    if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || typeof blob !== "string")
      return fail(400, "That save is not valid.");
    if (blob.length > LIMITS.maxSaveChars) return fail(413, "That save is too big.");
    const row = await env.DB.prepare("SELECT revision, blob FROM saves WHERE player_id = ?")
      .bind(player.id)
      .first<{ revision: number; blob: string }>();
    if (row && baseRevision !== row.revision)
      return json({ error: "The cloud has a newer save.", revision: row.revision, blob: row.blob }, 409);
    const next = (row?.revision ?? 0) + 1;
    // the conditional write closes the race between the read above and this write: it only lands
    // when nothing moved since the read, otherwise another device won and this one gets the 409
    const done = await env.DB.prepare(
      `INSERT INTO saves (player_id, revision, blob, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET revision = excluded.revision, blob = excluded.blob, updated_at = excluded.updated_at
       WHERE saves.revision = excluded.revision - 1`,
    )
      .bind(player.id, next, blob, deps.now().toISOString())
      .run();
    if ((done.meta.changes ?? 0) === 0) {
      const fresh = await env.DB.prepare("SELECT revision, blob FROM saves WHERE player_id = ?")
        .bind(player.id)
        .first<{ revision: number; blob: string }>();
      return json(
        { error: "The cloud has a newer save.", revision: fresh?.revision ?? 0, blob: fresh?.blob ?? "" },
        409,
      );
    }
    revision = next;
  }

  return json({
    accepted: verdicts.filter((v) => v.ok).length,
    rejected: verdicts.flatMap((v) =>
      v.ok ? [] : [{ id: v.event.id, kind: v.event.kind, reason: v.reason }],
    ),
    revision,
  });
}

export async function getSave(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, SIGNOUT);
  const row = await env.DB.prepare("SELECT revision, blob FROM saves WHERE player_id = ?")
    .bind(player.id)
    .first<{ revision: number; blob: string }>();
  return json(row ?? { revision: 0, blob: null });
}
