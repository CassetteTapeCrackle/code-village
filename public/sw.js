// Offline support. The build stamps BUILD_VERSION and writes precache.json (every app file in dist).
const CACHE = "code-village-BUILD_VERSION";
// Pyodide, Python's standard library and the library wheels (about 40 MB, only a Check needs them): cached
// on first use, and kept across app updates until Pyodide changes.
const PYODIDE = "pyodide-PYODIDE_VERSION";
// The drawn map terrain (src/village/terrainCache.ts): kept too, and it drops its own stale entries.
const TERRAIN = "code-village-terrain";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const list = await (await fetch("precache.json", { cache: "no-store" })).json();
      await cache.addAll(["./", ...list]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key !== CACHE && key !== PYODIDE && key !== TERRAIN) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // pages: fresh when online, the cached app shell when not
    event.respondWith(fetch(request).catch(async () => (await caches.match("./")) ?? Response.error()));
    return;
  }
  if (request.url.includes("/pyodide/")) {
    event.respondWith(
      (async () => {
        const pyodide = await caches.open(PYODIDE);
        const cached = await pyodide.match(request, { ignoreVary: true });
        if (cached) return cached;
        const response = await fetch(request);
        // a full or private-mode cache must not turn a good download into a failure
        if (response.ok) event.waitUntil(pyodide.put(request, response.clone()).catch(() => {}));
        return response;
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      // ignoreVary: module scripts arrive in CORS mode with an Origin header the precached copies lack
      const cached = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
      return response;
    })(),
  );
});
