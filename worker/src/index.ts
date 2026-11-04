import type { Env } from "./env";
import { askWorkersAi } from "./aiStream";
import { deleteInactive, wrapLegacyRecoveryHashes } from "./cron";
import { handle } from "./router";
import { verifyTurnstile } from "./turnstile";

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, {
      verifyHuman: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip),
      now: () => new Date(),
      askModel: (messages) => askWorkersAi(env, messages),
      waitUntil: (work) => ctx.waitUntil(work),
    });
  },
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        deleteInactive(env, new Date().toISOString().slice(0, 10)),
        wrapLegacyRecoveryHashes(env),
      ]),
    );
  },
} satisfies ExportedHandler<Env>;
