import type { Env } from "./env";
import { sha256Hex } from "./crypto";

export type Player = { id: number; nickname: string; nicknameKey: string };

export async function playerFor(
  request: Request,
  env: Env,
  kind: "main" | "agent",
  day: string,
): Promise<Player | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 20) return null;
  const row = await env.DB.prepare(
    `SELECT p.id, p.nickname, p.nickname_key AS nicknameKey FROM tokens t JOIN players p ON p.id = t.player_id
     WHERE t.hash = ? AND t.kind = ?`,
  )
    .bind(await sha256Hex(token), kind)
    .first<Player>();
  if (!row) return null;
  const banned = await env.DB.prepare("SELECT 1 FROM flags WHERE key = ?")
    .bind(`ban:${row.nicknameKey}`)
    .first();
  if (banned) return null;
  await env.DB.prepare("UPDATE players SET last_active = ? WHERE id = ?").bind(day, row.id).run();
  return row;
}
