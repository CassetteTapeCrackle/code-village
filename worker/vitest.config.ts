import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("worker/migrations");
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "worker/wrangler.jsonc" },
        // Workers AI has no local emulator and the tests inject deps.askModel, so the pool
        // must not open a remote proxy session (that would demand a CLOUDFLARE_API_TOKEN).
        remoteBindings: false,
        // a test-only binding, so the setup file can apply the migrations inside the Workers runtime
        // RECOVERY_KEY is a Worker secret in production; the tests key recovery hashes with a fixed one
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            GITHUB_ISSUES_TOKEN: "fake-token-for-tests",
            RECOVERY_KEY: "test-recovery-key",
          },
        },
      }),
    ],
    test: { include: ["worker/test/**/*.test.ts"], setupFiles: ["worker/test/apply-migrations.ts"] },
  };
});
