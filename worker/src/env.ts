// The Env shape (DB, ASSETS, TURNSTILE_SITE_KEY, TURNSTILE_SECRET, IP_SALT) is generated into
// worker-configuration.d.ts by `wrangler types`; regenerate it when wrangler.jsonc changes.
export type Env = Cloudflare.Env;

// Things the router needs from the outside world, swapped for fakes in tests.
export type Deps = {
  verifyHuman: (token: string, ip: string | null) => Promise<boolean>;
  now: () => Date;
  askModel: (messages: { role: string; content: string }[]) => Promise<ReadableStream<string>>;
  // Keeps the detached stream task alive after the response is returned.
  waitUntil: (work: Promise<unknown>) => void;
};
