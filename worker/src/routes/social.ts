import { bundle } from "../../../src/content/bundle";
import type { SyncEvent } from "../../../src/sync/events";
import { scoreFromEvents, type Score } from "../../../src/sync/score";
import type { BoardRow, NewsItem, PlayerCard } from "../../../src/sync/social";
import type { Deps, Env } from "../env";
import { fail, json } from "../http";
import { LIMITS } from "../limits";
import { rowToEvent } from "./sync";

type SocialEvent = SyncEvent & { received: string };
type PlayerEvents = { nickname: string; createdAt: string; lastActive: string; events: SocialEvent[] };
type Rankable = { row: BoardRow; createdAt: string };

const NEWS_KINDS = new Set(["lesson_passed", "boss_won", "boss_hard_won"]);

function isNewsEvent(e: SocialEvent): e is SocialEvent & { kind: NewsItem["kind"] } {
  return NEWS_KINDS.has(e.kind);
}

async function loadPlayers(env: Env): Promise<PlayerEvents[]> {
  const bans = (await env.DB.prepare("SELECT key FROM flags WHERE key LIKE 'ban:%'").all<{ key: string }>())
    .results;
  const banned = new Set(bans.map((r) => r.key.slice(4)));
  const rows = await env.DB.prepare(
    `SELECT p.nickname_key AS nicknameKey, p.nickname, p.created_at AS createdAt, p.last_active AS lastActive,
            e.kind, e.item_id AS id, e.at, e.received, e.hints
     FROM players p LEFT JOIN events e ON e.player_id = p.id`,
  ).all<{
    nicknameKey: string;
    nickname: string;
    createdAt: string;
    lastActive: string;
    kind: string | null;
    id: string | null;
    at: string | null;
    received: string | null;
    hints: number | null;
  }>();
  const byKey = new Map<string, PlayerEvents>();
  for (const row of rows.results) {
    if (banned.has(row.nicknameKey)) continue;
    let player = byKey.get(row.nicknameKey);
    if (!player) {
      player = { nickname: row.nickname, createdAt: row.createdAt, lastActive: row.lastActive, events: [] };
      byKey.set(row.nicknameKey, player);
    }
    if (row.kind === null || row.id === null || row.at === null || row.received === null) continue;
    const event = rowToEvent({ kind: row.kind, id: row.id, at: row.at, hints: row.hints, code: null });
    if (event) player.events.push({ ...event, received: row.received });
  }
  return [...byKey.values()];
}

function boardRow(player: PlayerEvents, score: Score): BoardRow {
  return {
    nickname: player.nickname,
    xp: score.xp,
    level: score.level,
    lessons: score.lessons,
    bossesWon: score.bossesWon,
    hardWins: score.hardWins,
    furthestWorld: score.furthestWorld,
    lastActive: player.lastActive,
  };
}

function rank(rows: Rankable[]): BoardRow[] {
  return rows
    .sort((a, b) => b.row.xp - a.row.xp || (a.createdAt < b.createdAt ? -1 : 1))
    .slice(0, 100)
    .map((r) => r.row);
}

// the ISO week, Monday first
function weekStart(now: Date): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// The cache key is canonical: only the parameters the answer depends on survive, so junk
// query strings cannot fill the cache or dodge a hit.
async function cached(key: Request, make: () => Promise<Response>): Promise<Response> {
  // the workerd runtime has caches.default; the generated CacheStorage type does not declare it
  const cache: Cache | undefined = (caches as { default?: Cache }).default;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const res = await make();
  if (!res.ok) return res;
  const out = new Response(res.body, { status: res.status, headers: new Headers(res.headers) });
  out.headers.set("cache-control", `public, max-age=${LIMITS.leaderboardCacheSeconds}`);
  if (cache) await cache.put(key, out.clone());
  return out;
}

export async function leaderboard(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") === "week" ? "week" : "all";
  const key = new Request(`${url.origin}${url.pathname}${period === "week" ? "?period=week" : ""}`);
  return cached(key, async () => {
    const players = await loadPlayers(env);
    const start = weekStart(deps.now());
    const rankable = players.map((p): Rankable => {
      // shortcut: scores are computed per request from all events, cached 60 s; precompute a table once players number in the thousands
      const score = scoreFromEvents(
        bundle,
        period === "week" ? p.events.filter((e) => e.received >= start) : p.events,
      );
      return { row: boardRow(p, score), createdAt: p.createdAt };
    });
    return json({ period, rows: rank(period === "week" ? rankable.filter((r) => r.row.xp > 0) : rankable) });
  });
}

export async function playerCard(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let nickname: string;
  try {
    nickname = decodeURIComponent(url.pathname.slice("/api/players/".length)).toLowerCase();
  } catch {
    return fail(404, "No such player.");
  }
  return cached(new Request(`${url.origin}${url.pathname}`), async () => {
    // one indexed lookup first: a random nickname must not trigger the full board load
    const exists = await env.DB.prepare("SELECT 1 FROM players WHERE nickname_key = ?")
      .bind(nickname)
      .first();
    if (!exists) return fail(404, "No such player.");
    const players = await loadPlayers(env);
    const player = players.find((p) => p.nickname.toLowerCase() === nickname);
    if (!player) return fail(404, "No such player.");
    const score = scoreFromEvents(bundle, player.events);
    const recent: NewsItem[] = player.events
      .filter(isNewsEvent)
      .sort((a, b) => (a.received < b.received ? 1 : -1))
      .slice(0, 5)
      .map((e) => ({ nickname: player.nickname, kind: e.kind, id: e.id, day: e.at }));
    const card: PlayerCard = {
      ...boardRow(player, score),
      joined: player.createdAt,
      trophies: score.trophies,
      recent,
    };
    return json(card);
  });
}

export async function news(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  return cached(new Request(`${url.origin}${url.pathname}`), async () => {
    const players = await loadPlayers(env);
    const items: NewsItem[] = players
      .flatMap((p) => p.events.filter(isNewsEvent).map((e) => ({ nickname: p.nickname, event: e })))
      .sort((a, b) =>
        a.event.received < b.event.received
          ? 1
          : a.event.received > b.event.received
            ? -1
            : a.nickname < b.nickname
              ? -1
              : 1,
      )
      .slice(0, LIMITS.newsItems)
      .map((x) => ({ nickname: x.nickname, kind: x.event.kind, id: x.event.id, day: x.event.at }));
    return json({ items });
  });
}
