import type { MapColors } from "../../art/palette";
import { oval, paintAt, type Paint } from "../../art/paint";
import { shoreLine } from "../areas";
import { TILE } from "../grid";
import type { Place } from "../layout";
import { hash01 } from "../noise";
import type { LairState } from "../render";

type Colors = { c: MapColors; s: Record<string, string> };
type ShoreLair = (ctx: CanvasRenderingContext2D, colors: Colors, place: Place, state: LairState) => void;

const shoreYPx = (x: number): number => shoreLine(x / TILE) * TILE;

// A colour halfway to the sea, so a wreck's hull looks sunk rather than painted on top of the water.
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) =>
        Math.round(v * (1 - t) + pb[i] * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

// A boulder, drawn like the shore's own rocks: an outline, three tones lit from the top left, a soft shadow.
function boulder(p: Paint, cx: number, cy: number, r: number, c: MapColors, s: Record<string, string>): void {
  const rx = r;
  const ry = r * 0.75;
  for (let y = Math.floor(cy - ry) - 1; y < Math.floor(cy + ry) + 4; y++)
    for (let x = Math.floor(cx - rx) - 1; x < Math.floor(cx + rx) + 4; x++)
      if (((x - cx - 2) / rx) ** 2 + ((y - cy - 2) / ry) ** 2 <= 1) p.shade(x, y, 0.2);
  for (let y = Math.floor(cy - ry) - 1; y < Math.floor(cy + ry) + 2; y++)
    for (let x = Math.floor(cx - rx) - 1; x < Math.floor(cx + rx) + 2; x++) {
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e > 1) continue;
      if (e > 0.78) {
        p.put(x, y, s.k);
        continue;
      }
      const light = (-0.6 * (x - cx)) / rx + (-0.8 * (y - cy)) / ry;
      p.put(x, y, light > 0.45 ? c.rock3 : light < -0.35 ? c.rock2 : c.rock);
    }
}

// The lighthouse on its stone platform: banded tower, dark lamp room, cap, all asleep.
function lighthouse(
  p: Paint,
  s: Record<string, string>,
  c: MapColors,
  x: number,
  y: number,
  lit = false,
): void {
  // stone platform
  for (let yy = y + 46; yy < y + 53; yy++)
    for (let xx = x - 5; xx < x + 19; xx++)
      p.put(
        xx,
        yy,
        yy === y + 52 || xx === x - 5 || xx === x + 18
          ? s.k
          : yy === y + 46
            ? c.stone
            : (Math.floor(xx / 5) + yy) % 2
              ? c.stone2
              : c.stone,
      );
  for (let yy = y + 47; yy < y + 56; yy++) for (let xx = x + 19; xx < x + 22; xx++) p.shade(xx, yy, 0.25);
  // tower, banded, shaded on the right
  for (let j = 0; j < 36; j++) {
    const w = 10 + Math.floor(j / 9);
    const x0 = x + 7 - Math.floor(w / 2);
    const red = Math.floor(j / 6) % 2 === 0;
    for (let i = 0; i < w; i++)
      p.put(x0 + i, y + 11 + j, i >= w - 3 ? (red ? s.T : s.cream) : red ? s.r : s.W);
    p.put(x0 - 1, y + 11 + j, s.k);
    p.put(x0 + w, y + 11 + j, s.k);
    p.shade(x0 + w + 1, y + 13 + j, 0.25);
    p.shade(x0 + w + 2, y + 13 + j, 0.2);
  }
  p.fill(x + 6, y + 40, 3, 6, s.k);
  p.fill(x + 7, y + 41, 1, 5, s.o);
  p.put(x + 7, y + 22, s.k);
  p.put(x + 7, y + 30, s.k);
  // gallery, lamp room, cap
  p.fill(x - 1, y + 9, 16, 2, s.k);
  for (let i = 0; i < 16; i += 2) p.put(x - 1 + i, y + 8, s.k);
  p.fill(x + 2, y + 3, 10, 6, s.k);
  p.fill(x + 3, y + 4, 8, 4, lit ? s.y : s.N);
  if (!lit) p.put(x + 4, y + 4, s.z);
  for (let j = 0; j < 4; j++) p.fill(x + 3 + j, y - 1 + j, 8 - 2 * j + 1, 1, j === 0 ? s.k : s.r);
  p.put(x + 7, y - 3, s.k);
  p.put(x + 7, y - 2, s.k);
  if (lit)
    for (let i = 0; i < 26; i++) {
      p.put(x + 12 + i, y + 5 - i / 6, s.y);
      p.put(x - 2 - i, y + 5 - i / 6, s.y);
    }
}

// The wreck: a dark wooden hull on its side, ribs showing, half sunk in the cove's shallows.
function wreck(p: Paint, c: MapColors, s: Record<string, string>, cx: number, cy: number, scale = 1): void {
  const ang = -0.3;
  const L = 36 * scale;
  const Wd = 14 * scale;
  const reach = Math.ceil(26 * scale);
  for (let yy = -reach; yy <= reach; yy++)
    for (let xx = -reach; xx <= reach; xx++) {
      const u = xx * Math.cos(ang) + yy * Math.sin(ang);
      const v = -xx * Math.sin(ang) + yy * Math.cos(ang);
      const t = (u + L / 2) / L;
      if (t < 0 || t > 1) continue;
      const half = (Wd / 2) * (t < 0.62 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2)));
      if (Math.abs(v) > half) continue;
      const x = cx + xx;
      const y = cy + yy;
      let col = s.H;
      if (Math.abs(v) > half - 1)
        col = s.k; // the outline
      else if (Math.abs(v) > half - 2)
        col = s.h; // the lit rim of the hull
      else if (Math.round(u) % 4 === 0) col = s.plankLight; // a rib
      if (y > shoreYPx(x) + 1) col = mix(col, c.sea, 0.45);
      p.put(x, y, col);
    }
  for (let x = cx - Math.round(20 * scale); x < cx + Math.round(20 * scale); x++) {
    const y = Math.round(shoreYPx(x)) + 1;
    if (hash01(x, y, 4) < 0.7) p.put(x, y, s.W); // a line of foam at the waterline
  }
}

const drawPools: ShoreLair = (ctx, { c, s }, place) => {
  // step 5 adds the cleared look (clear water, starfish, anemones); every state draws the asleep look for now
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  paintAt(ctx, x0 - 4, y0 - 4, place.w * TILE + 8, place.h * TILE + 8, (p) => {
    for (const [cx, cy, rx, ry] of [
      [5.6, 75.2, 8, 5],
      [8.4, 76.6, 7, 4],
    ] as const)
      oval(p, cx * TILE, cy * TILE, rx, ry, (x, y) => ((x + y) % 4 === 0 ? s.z : s.N), s.k);
    for (const [cx, cy, r] of [
      [4.6, 76.4, 5],
      [7.6, 77.1, 6],
      [9.6, 76.3, 4],
    ] as const)
      boulder(p, cx * TILE, cy * TILE, r, c, s);
  });
};

const drawWreck: ShoreLair = (ctx, { c, s }, place) => {
  // step 5 adds the cleared look (crabs, a buoy); every state draws the bare wreck for now
  const scale = 1.3;
  const cx = (place.x + place.w / 2) * TILE;
  const cy = shoreYPx(cx) - 1;
  const pad = Math.ceil(30 * scale);
  paintAt(ctx, cx - pad, cy - pad, pad * 2, pad * 2, (p) => wreck(p, c, s, cx, cy, scale));
};

const drawLighthouse: ShoreLair = (ctx, { c, s }, place) => {
  // step 5 adds the lit lamp and its night beam; every state draws the dark lighthouse for now
  const x = place.x * TILE + (place.w * TILE) / 2 - 7;
  const y = place.y * TILE + 11;
  paintAt(ctx, x - 8, y - 4, 30, 62, (p) => lighthouse(p, s, c, x, y, false));
};

export const SHORE_LAIRS: Record<"pools" | "wreck" | "lighthouse", ShoreLair> = {
  pools: drawPools,
  wreck: drawWreck,
  lighthouse: drawLighthouse,
};
