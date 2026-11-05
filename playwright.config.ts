import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  // the CI job uploads these: an html report plus a screenshot of every failing test
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:5173", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "pnpm dev --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      // a fresh worktree copies Pyodide and builds every module on its first start, which takes over two minutes
      timeout: 300_000,
    },
    // the production build, for the service worker (offline) test; the generated specs never use it
    ...(process.env.E2E_NO_PREVIEW
      ? []
      : [
          {
            command: "pnpm build && pnpm preview --port 4173 --strictPort",
            url: "http://localhost:4173",
            reuseExistingServer: true,
            timeout: 240_000,
          },
        ]),
  ],
});
