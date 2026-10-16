// The map's terrain (tiles, river, paths, shadows) follows the palette and the season alone, and takes
// about 0.4 s at 1x to paint. It is kept in Cache Storage as a lossless PNG and decoded on a later visit
// instead of repainted. The key carries __BUILD_ID__, so a build whose painting could differ never shows
// another build's picture, and every other key is dropped as soon as a new picture is stored.
const CACHE = "code-village-terrain";
const PATH = "/__terrain__/";
// Bump when drawTerrain's output changes in a way a source stamp cannot see (nothing does today).
const TERRAIN_PAINT = 1;

export function terrainCacheKey(palette: string, season: string): string {
  return `${PATH}${__BUILD_ID__}/${TERRAIN_PAINT}/${palette}/${season}`;
}

// A stored picture, decoded onto a canvas of the map's size, or null when there is none, Cache Storage is
// missing, or the entry cannot be decoded: the caller then paints the terrain as before.
export async function cachedTerrain(key: string, w: number, h: number): Promise<HTMLCanvasElement | null> {
  try {
    if (typeof caches === "undefined" || typeof createImageBitmap !== "function") return null;
    const hit = await (await caches.open(CACHE)).match(key);
    if (!hit) return null;
    const bitmap = await createImageBitmap(await hit.blob());
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas;
  } catch {
    return null;
  }
}

// Stores the picture and forgets every older one, so the cache holds a single palette and season.
export async function keepTerrain(key: string, canvas: HTMLCanvasElement): Promise<void> {
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const cache = await caches.open(CACHE);
    for (const old of await cache.keys()) await cache.delete(old);
    await cache.put(key, new Response(blob, { headers: { "content-type": "image/png" } }));
  } catch {
    // a full or private-mode cache: the map is simply drawn again next visit
  }
}
