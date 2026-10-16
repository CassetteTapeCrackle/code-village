import { afterEach, expect, test, vi } from "vitest";
import { cachedTerrain, keepTerrain, terrainCacheKey } from "./terrainCache";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("the terrain key names the build, the palette and the season", () => {
  const key = terrainCacheKey("night", "winter");
  expect(key).toContain(__BUILD_ID__);
  expect(key.endsWith("/night/winter")).toBe(true);
  expect(terrainCacheKey("day", "winter")).not.toBe(key);
  expect(terrainCacheKey("night", "summer")).not.toBe(key);
});

test("a stored picture is decoded and drawn over the whole terrain canvas", async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const store = new Map([[terrainCacheKey("day", "summer"), new Response(blob)]]);
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (k: string) => store.get(k) ?? null,
      keys: async () => [],
      put: async () => undefined,
      delete: async () => false,
    }),
  });
  const close = vi.fn();
  vi.stubGlobal("createImageBitmap", async () => ({ close }));
  const drawn: unknown[][] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: (...args: unknown[]) => drawn.push(args),
  } as unknown as CanvasRenderingContext2D);

  const canvas = await cachedTerrain(terrainCacheKey("day", "summer"), 768, 512);

  expect(canvas?.width).toBe(768);
  expect(canvas?.height).toBe(512);
  expect(drawn).toHaveLength(1);
  expect(drawn[0].slice(1)).toEqual([0, 0]);
  expect(close).toHaveBeenCalled();
});

test("a miss, and a cache that cannot be opened, both leave the caller to paint", async () => {
  vi.stubGlobal("caches", undefined);
  await expect(cachedTerrain(terrainCacheKey("day", "summer"), 768, 512)).resolves.toBeNull();

  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) =>
    cb(new Blob(["x"], { type: "image/png" })),
  );
  vi.stubGlobal("caches", {
    open: async () => {
      throw new Error("no storage");
    },
  });
  await expect(
    keepTerrain(terrainCacheKey("day", "summer"), document.createElement("canvas")),
  ).resolves.toBeUndefined();
});
