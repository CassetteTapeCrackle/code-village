import { playerFor } from "../auth";
import { randomToken, sha256Hex } from "../crypto";
import type { Deps, Env } from "../env";
import { fail, json } from "../http";

const SIGNOUT = "Sign in again: this device is not registered.";

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

// One agent token per learner: making a new one revokes the old, and only its hash is stored.
export async function makeAgentToken(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, SIGNOUT);
  const now = deps.now();
  const token = randomToken();
  // one batch keeps exactly one agent token even when two makes race: without it the deletes and
  // inserts interleave and two valid tokens survive
  await env.DB.batch([
    env.DB.prepare("DELETE FROM tokens WHERE player_id = ? AND kind = 'agent'").bind(player.id),
    env.DB.prepare("INSERT INTO tokens (hash, player_id, kind, created_at) VALUES (?, ?, 'agent', ?)").bind(
      await sha256Hex(token),
      player.id,
      now.toISOString(),
    ),
  ]);
  return json({ token, createdAt: now.toISOString() }, 201);
}

export async function revokeAgentToken(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, SIGNOUT);
  await env.DB.prepare("DELETE FROM tokens WHERE player_id = ? AND kind = 'agent'").bind(player.id).run();
  return new Response(null, { status: 204 });
}

export async function agentTokenStatus(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, SIGNOUT);
  const row = await env.DB.prepare(
    "SELECT created_at AS createdAt FROM tokens WHERE player_id = ? AND kind = 'agent'",
  )
    .bind(player.id)
    .first<{ createdAt: string }>();
  return json({ exists: row !== null, createdAt: row?.createdAt ?? null });
}
