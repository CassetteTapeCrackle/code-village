import { addDays } from "../../src/learning/dates";
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
