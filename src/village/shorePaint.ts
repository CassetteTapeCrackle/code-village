import type { MapColors } from "../art/palette";
import { pixelBuffer } from "../art/pixels";
import { AREAS, shoreLine } from "./areas";
import { TILE } from "./grid";
import type { VillageMap } from "./layout";
import { bayer, fbm, hash01, valueNoise } from "./noise";

type Colors = { c: MapColors; s: Record<string, string> };
type MapKey = keyof MapColors;

// The shore area's own rect and ground (see areas.ts). drawShore paints the sea, wet sand and dry sand
// inside it and leaves the lawn above the dune line to drawVillageGround.
const SHORE = AREAS.find((a) => a.style === "shore")!;

// The sea's colour at a pixel, ported from the mockup's water branch (shoremock.py): five depths
// ordered-dithered together, wave crests, sun sparkles and breaking foam along the waterline.
export function waterKey(gx: number, gy: number): MapKey {
  const x = gx / 8;
  const y = gy / 8;
  const d = y - shoreLine(x); // tiles below the waterline (> 0 is sea)
  const depth = d + 0.6 * (fbm(x / 3, y / 3, 50) - 0.5);
  const bands: readonly [number, MapKey][] = [
    [0.7, "shallow"],
    [1.4, "shallow2"],
    [2.6, "sea"],
    [4.2, "deep"],
    [99, "deeper"],
  ];
  let col: MapKey = bands[bands.length - 1][1];
  for (let i = 0; i < bands.length; i++) {
    const [lim, name] = bands[i];
    if (depth >= lim) continue;
    const prev = i ? bands[i - 1][0] : 0;
    const t = lim < 99 ? (depth - prev) / (lim - prev) : 0;
    col = name;
    if (i + 1 < bands.length && t > 0.7 && bayer(gx, gy) < (t - 0.7) / 0.3) col = bands[i + 1][1];
    break;
  }
  const wave = (gy + 3 * Math.sin(gx / 11 + gy / 17)) % 14;
  if (depth > 1.6 && wave < 1 && hash01(Math.floor(gx / 3), gy, 51) < 0.55) col = "crest";
  if (depth > 2.4 && hash01(gx, gy, 52) < 0.0035) col = "sparkle";
  if (d < 0.28 + 0.12 * Math.sin(gx / 3.3) && hash01(Math.floor(gx / 2), gy, 53) < 0.9) col = "foam";
  return col;
}

// The sand's colour at a pixel: a wet band with ripple lines just above the water, then dry sand in
// three tones with the odd grain. The wet band matches the shore area's "wet" ground.
export function sandKey(gx: number, gy: number): MapKey {
  const x = gx / 8;
  const y = gy / 8;
  const d = y - shoreLine(x);
  if (d > -1.2 + 0.25 * valueNoise(x * 2, 1, 60)) {
    let col: MapKey = fbm(x / 2, y / 2, 61) > 0.45 ? "wet" : "wet2";
    if ((gy + Math.round(2 * Math.sin(gx / 5))) % 5 === 0 && hash01(Math.floor(gx / 2), gy, 62) < 0.7)
      col = "ripple";
    return col;
  }
  const n = fbm(gx / 16, gy / 16, 80);
  let col: MapKey = n > 0.68 ? "sand3" : n < 0.3 ? "sand2" : "sand";
  if (hash01(gx, gy, 81) < 0.05) col = "grain";
  return col;
}

// The shore's water, wet sand and dry sand, painted once into the cached terrain layer. Paths, buildings
// and gates are left to their own painters.
export function drawShore(ctx: CanvasRenderingContext2D, map: VillageMap, { c }: Colors): void {
  const r = SHORE.rect;
  const buf = pixelBuffer(ctx, r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
  const ground = SHORE.ground!;
  for (let ty = r.y; ty < r.y + r.h; ty++) {
    for (let tx = r.x; tx < r.x + r.w; tx++) {
      if ("=#PGB".includes(map.tiles[ty][tx])) continue;
      for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++) {
        for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) {
          const g = ground(gx / TILE, gy / TILE);
          if (g === "sea") buf.set(gx, gy, c[waterKey(gx, gy)]);
          else if (g === "wet" || g === "sand") buf.set(gx, gy, c[sandKey(gx, gy)]);
        }
      }
    }
  }
  buf.flush();
}
