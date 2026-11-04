import type { Deps, Env } from "./env";
import { fail, json } from "./http";
import { mcp } from "./mcp";
import { agentTokenStatus, makeAgentToken, revokeAgentToken } from "./routes/agent";
import { deleteMe, me, recover, register } from "./routes/identity";
import { getSave, sync } from "./routes/sync";
import { leaderboard, news, playerCard } from "./routes/social";
import { tutor } from "./routes/tutor";

export async function handle(request: Request, env: Env, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname === "/mcp") {
    const { success } = await env.API_RATE_LIMIT.limit({
      key: request.headers.get("cf-connecting-ip") ?? "unknown",
    });
    if (!success) return fail(429, "Too many requests from here. Wait a minute, then try again.");
  }
  if (url.pathname === "/api/health") return json({ ok: true, time: deps.now().toISOString() });
  if (url.pathname === "/api/register" && request.method === "POST") return register(request, env, deps);
  if (url.pathname === "/api/recover" && request.method === "POST") return recover(request, env, deps);
  if (url.pathname === "/api/me" && request.method === "GET") return me(request, env, deps);
  if (url.pathname === "/api/me" && request.method === "DELETE") return deleteMe(request, env, deps);
  if (url.pathname === "/api/agent-token" && request.method === "POST")
    return makeAgentToken(request, env, deps);
  if (url.pathname === "/api/agent-token" && request.method === "DELETE")
    return revokeAgentToken(request, env, deps);
  if (url.pathname === "/api/agent-token" && request.method === "GET")
    return agentTokenStatus(request, env, deps);
  if (url.pathname === "/mcp") return mcp(request, env, deps);
  if (url.pathname === "/api/sync" && request.method === "POST") return sync(request, env, deps);
  if (url.pathname === "/api/save" && request.method === "GET") return getSave(request, env, deps);
  if (url.pathname === "/api/leaderboard" && request.method === "GET") return leaderboard(request, env, deps);
  if (url.pathname.startsWith("/api/players/") && request.method === "GET") return playerCard(request, env);
  if (url.pathname === "/api/news" && request.method === "GET") return news(request, env);
  if (url.pathname === "/api/tutor" && request.method === "POST") return tutor(request, env, deps);
  if (url.pathname.startsWith("/api/")) return fail(404, "No such API route.");
  return env.ASSETS.fetch(request);
}
