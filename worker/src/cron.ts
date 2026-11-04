import { addDays } from "../../src/learning/dates";
import { WRAPPED_RECOVERY_PREFIX, wrapRecoveryHash } from "./crypto";
import type { Env } from "./env";
import { LIMITS } from "./limits";
import { deletePlayerRows } from "./routes/identity";

export async function deleteInactive(env: Env, today: string): Promise<number> {
  // days are YYYY-MM-DD, so string comparison is date comparison
  const cutoff = addDays(today, -LIMITS.inactiveDays);
  const rows = await env.DB.prepare("SELECT id FROM players WHERE last_active < ?")
    .bind(cutoff)
    .all<{ id: number }>();
  for (const row of rows.results) await deletePlayerRows(env, row.id);
  return rows.results.length;
}

// Rows from before keyed recovery hashes hold the plain SHA-256: wrap them once, in one batch.
export async function wrapLegacyRecoveryHashes(env: Env): Promise<number> {
  const rows = await env.DB.prepare(
    "SELECT id, recovery_hash AS hash FROM players WHERE recovery_hash NOT LIKE ?",
  )
    .bind(`${WRAPPED_RECOVERY_PREFIX}%`)
    .all<{ id: number; hash: string }>();
  const updates = await Promise.all(
    rows.results.map(async (row) =>
      env.DB.prepare("UPDATE players SET recovery_hash = ? WHERE id = ?").bind(
        await wrapRecoveryHash(env.RECOVERY_KEY, row.hash),
        row.id,
      ),
    ),
  );
  if (updates.length) await env.DB.batch(updates);
  return updates.length;
}
