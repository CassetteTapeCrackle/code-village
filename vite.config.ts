import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";

// A stamp of every source file, handed to the app as __BUILD_ID__. The stored terrain picture (Village)
// carries it in its key, so a build whose painting could differ never shows another build's map.
function sourceStamp(): string {
  const hash = createHash("sha256");
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  for (const file of walk("src").sort()) hash.update(file).update(readFileSync(file));
  return hash.digest("hex").slice(0, 12);
}

// After a build: list every app file in dist for the service worker to precache (not Pyodide and its
// library wheels, which only a Check needs: those are cached on first use), and stamp sw.js with the
// app's and Pyodide's versions.
function precache(): Plugin {
  return {
    name: "precache-list",
    apply: "build",
    closeBundle() {
      const dist = "dist";
      const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((name) =>
          statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)],
        );
      const files = walk(dist)
        .map((f) => relative(dist, f).split("\\").join("/"))
        .filter((f) => f !== "sw.js" && f !== "precache.json" && !f.startsWith("pyodide/"))
        .sort();
      const version = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 12);
      writeFileSync(join(dist, "precache.json"), JSON.stringify(files));
      const sw = join(dist, "sw.js");
      const pyodide = JSON.parse(readFileSync("node_modules/pyodide/package.json", "utf8")).version;
      writeFileSync(
        sw,
        readFileSync(sw, "utf8")
          .replace("code-village-BUILD_VERSION", `code-village-${version}`)
          .replace("PYODIDE_VERSION", pyodide),
      );
    },
  };
}

export const config = defineConfig({
  plugins: [svelte(), svelteTesting(), precache()],
  define: { __BUILD_ID__: JSON.stringify(sourceStamp()) },
  base: "./",
  server: { proxy: { "/api": "http://127.0.0.1:8787", "/mcp": "http://127.0.0.1:8787" } },
  worker: { format: "es" },
  // Pyodide loads its own wasm files from public/pyodide; prebundling breaks that.
  optimizeDeps: { exclude: ["pyodide"] },
  test: { environment: "jsdom", include: ["src/**/*.test.ts"], setupFiles: ["src/test-setup.ts"] },
});
export default config;
