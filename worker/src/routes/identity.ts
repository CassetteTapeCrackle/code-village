import type { Deps, Env } from "../env";
import { fail, json, readBody } from "../http";
import {
  newRecoveryCode,
  normalizeRecoveryCode,
  randomToken,
  recoveryHash,
  sha256Hex,
  wrapRecoveryHash,
} from "../crypto";
import { takeIpSlot } from "../limits";
import { playerFor } from "../auth";

const NICKNAME = /^[A-Za-z0-9_-]{3,20}$/;

function validNickname(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return NICKNAME.test(trimmed) ? trimmed : null;
}

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const ipOf = (r: Request): string | null => r.headers.get("cf-connecting-ip");

async function issueToken(env: Env, playerId: number, kind: "main" | "agent", now: Date): Promise<string> {
  const token = randomToken();
  await env.DB.prepare("INSERT INTO tokens (hash, player_id, kind, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), playerId, kind, now.toISOString())
    .run();
  return token;
}

export async function register(request: Request, env: Env, deps: Deps): Promise<Response> {
  const body = await readBody(request, 2_000);
  if (body instanceof Response) return body;
  const { nickname: raw, turnstile } = (body ?? {}) as { nickname?: unknown; turnstile?: unknown };
  const nickname = validNickname(raw);
  if (!nickname) return fail(400, "Use 3 to 20 letters, digits, - or _.");
  if (!(await deps.verifyHuman(typeof turnstile === "string" ? turnstile : "", ipOf(request))))
    return fail(403, "The human check failed. Try again.");
  const now = deps.now();
  const key = nickname.toLowerCase();
  // a ban outlives the deleted player row, so a banned nickname must never register again
  const banned = await env.DB.prepare("SELECT 1 FROM flags WHERE key = ?").bind(`ban:${key}`).first();
  if (banned) return fail(403, "That nickname is not available.");
  // the nickname check comes before the per-IP slot: trying taken nicknames must not burn the day's
  // allowance for everyone behind one IP (a classroom shares it)
  const taken = await env.DB.prepare("SELECT 1 FROM players WHERE nickname_key = ?").bind(key).first();
  if (taken) return fail(409, "That nickname is taken.");
  if (!(await takeIpSlot(env, ipOf(request), "register", dayOf(now))))
    return fail(429, "Too many new nicknames from here today.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const recoveryCode = newRecoveryCode();
    const row = await env.DB.prepare(
      `INSERT INTO players (nickname, nickname_key, recovery_hash, created_at, last_active) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING RETURNING id`,
    )
      .bind(nickname, key, await recoveryHash(env.RECOVERY_KEY, recoveryCode), now.toISOString(), dayOf(now))
      .first<{ id: number }>();
    if (!row) {
      const nowTaken = await env.DB.prepare("SELECT 1 FROM players WHERE nickname_key = ?").bind(key).first();
      if (nowTaken) return fail(409, "That nickname is taken.");
      continue; // recovery code collision: draw another
    }
    const token = await issueToken(env, row.id, "main", now);
    return json({ nickname, token, recoveryCode }, 201);
  }
  return fail(500, "Could not register right now. Try again.");
}

export async function recover(request: Request, env: Env, deps: Deps): Promise<Response> {
  const body = await readBody(request, 2_000);
  if (body instanceof Response) return body;
  const { recoveryCode, turnstile } = (body ?? {}) as { recoveryCode?: unknown; turnstile?: unknown };
  if (!(await deps.verifyHuman(typeof turnstile === "string" ? turnstile : "", ipOf(request))))
    return fail(403, "The human check failed. Try again.");
  const now = deps.now();
  if (!(await takeIpSlot(env, ipOf(request), "recover", dayOf(now))))
    return fail(429, "Too many tries from here today.");
  const plain = await sha256Hex(normalizeRecoveryCode(typeof recoveryCode === "string" ? recoveryCode : ""));
  // shortcut: the plain hash still finds rows the nightly cron has not wrapped yet; drop it from the lookup
  // once no player's recovery_hash lacks the "v2:" prefix
  const player = await env.DB.prepare("SELECT id, nickname FROM players WHERE recovery_hash IN (?, ?)")
    .bind(await wrapRecoveryHash(env.RECOVERY_KEY, plain), plain)
    .first<{ id: number; nickname: string }>();
  if (!player) return fail(404, "No nickname has that recovery code.");
  // recovering locks out anyone holding an old token, agent ones included: a recovered account
  // means a token may be in the wrong hands
  await env.DB.prepare("DELETE FROM tokens WHERE player_id = ?").bind(player.id).run();
  const token = await issueToken(env, player.id, "main", now);
  await env.DB.prepare("UPDATE players SET last_active = ? WHERE id = ?").bind(dayOf(now), player.id).run();
  return json({ nickname: player.nickname, token });
}

export async function me(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, "Sign in again: this device is not registered.");
  return json({ nickname: player.nickname });
}

export async function deletePlayerRows(env: Env, playerId: number): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM events WHERE player_id = ?").bind(playerId),
    env.DB.prepare("DELETE FROM saves WHERE player_id = ?").bind(playerId),
    env.DB.prepare("DELETE FROM snapshots WHERE player_id = ?").bind(playerId),
    env.DB.prepare("DELETE FROM quota WHERE player_id = ?").bind(playerId),
    env.DB.prepare("DELETE FROM tokens WHERE player_id = ?").bind(playerId),
    env.DB.prepare("DELETE FROM players WHERE id = ?").bind(playerId),
  ]);
}

export async function deleteMe(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "main", dayOf(deps.now()));
  if (!player) return fail(401, "Sign in again: this device is not registered.");
  await deletePlayerRows(env, player.id);
  return new Response(null, { status: 204 });
}
