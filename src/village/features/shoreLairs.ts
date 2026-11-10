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

// The wreck: a hull on her side in the cove's shallows, planks stove in and her ribs showing, the mast
// snapped on the sand above her and a rag of sail trailing into the water. She lies stern in the sea, bow
// up the sand; local i runs along her length, v down from the waterline.
function wreck(p: Paint, c: MapColors, s: Record<string, string>, cx: number, cy: number): void {
  const L = 54;
  const x0 = cx - 22;
  const waterline = (x: number): number => Math.round(shoreYPx(x)) + 1;
  // everything below the water wears the sea's tint, so the hull reads as sunk rather than painted over it
  const put = (x: number, y: number, color: string): void =>
    p.put(x, y, y > waterline(x) ? mix(color, c.sea, 0.45) : color);

  // her sheer and her keel, as [station, depth]: a narrow bow up on the sand, a wide stern down in the sea
  const along = (stations: readonly (readonly [number, number])[], i: number): number => {
    const k = stations.findIndex(([at]) => at >= i);
    if (k <= 0) return stations[Math.max(0, k)][1];
    const [a0, v0] = stations[k - 1];
    const [a1, v1] = stations[k];
    return v0 + ((v1 - v0) * (i - a0)) / (a1 - a0);
  };
  const sheer = [
    [0, -8],
    [8, -7],
    [18, -6],
    [28, -4.5],
    [38, -3],
    [46, -1.5],
    [53, 0],
  ] as const;
  const keel = [
    [0, 0],
    [8, 6],
    [18, 10],
    [26, 11],
    [34, 12],
    [42, 12],
    [53, 13],
  ] as const;
  // bites broken out of her sheer
  const notch = (i: number): number =>
    [
      [6, 4, 1.5],
      [15, 5, 2],
      [31, 4, 2],
      [42, 4, 1.5],
    ].reduce((d, [at, w, deep]) => Math.max(d, deep * (1 - Math.abs(i - at) / (w / 2))), 0);
  const top = (i: number): number => Math.round(along(sheer, i) + Math.max(0, notch(i)));
  const bottom = (i: number): number => Math.round(along(keel, i));

  // planks stove in: dark inside, her frames standing through, their line curving toward the bilge
  const gap = (i: number, v: number, first: number, last: number): boolean => {
    const h = hash01(i, v, 71);
    return (
      i >= first + (h < 0.3 ? 1 : 0) && i <= last - (h > 0.7 ? 1 : 0) && v >= top(i) + 2 && v <= bottom(i) - 3
    );
  };
  const frame = (i: number, v: number, first: number): boolean => {
    const t = (v - top(i)) / Math.max(1, bottom(i) - top(i));
    const k = i - first - 1 - Math.round(1.2 * Math.sin(Math.PI * t));
    return k >= 0 && k % 4 === 0;
  };
  // one more hole stove through her side, its splintered lip catching the light from the top left
  const rips = (i: number, v: number): boolean => {
    const mid = (top(i) + bottom(i)) / 2;
    return ((i - 26.5) / 3.3) ** 2 + ((v - mid) / 2.8) ** 2 < 1 + (hash01(i, v, 53) - 0.5) * 0.6;
  };

  for (let i = 0; i < L; i++) {
    const x = x0 + i;
    const t = top(i);
    const b = bottom(i);
    for (let v = t; v <= b; v++) {
      const y = cy + v;
      let col: string;
      if (v === t || v === b)
        col = s.k; // the broken edge and her keel
      else if (v === t + 1)
        col = notch(i) > 0.5 ? s.k : s.h; // torn open at the bites, lit elsewhere
      else if (gap(i, v, 10, 21)) col = frame(i, v, 10) ? s.plankLight : s.k;
      else if (gap(i, v, 32, 43)) col = frame(i, v, 32) ? s.plankLight : s.k;
      else if (rips(i, v)) col = !rips(i - 1, v) || !rips(i, v - 1) ? s.plankLight : s.k;
      else {
        // her remaining planks run lengthwise, dark seams and a lit strake under the sheer
        col = (v - t - 1) % 3 === 2 ? s.H : hash01(x, y, 17) < 0.07 ? s.o : s.d;
      }
      // barnacles crusted on her near the tide line
      if (
        col !== s.k &&
        col !== s.plankLight &&
        col !== s.h &&
        Math.abs(y - waterline(x)) <= 2 &&
        hash01(x, y, 19) < 0.22
      )
        col = hash01(x, y, 29) < 0.4 ? s.cream : s.s;
      put(x, y, col);
    }
  }

  // a rag of her sail, still bent to the broken spar and trailing into the water over her bow
  for (let y = 595; y <= 609; y++)
    for (let x = 338; x <= 358; x++) {
      const t = (y - 595) / 14;
      const left = 344 - 3 * t + (hash01(x, y, 61) - 0.5) * 1.6;
      const right = 351 + 3 * t + (hash01(x, y, 62) - 0.5) * 1.6;
      if (x < left || x > right) continue;
      if (y > 602 && hash01(x, y, 63) < (y - 602) / 12) continue; // the torn hem
      put(
        x,
        y,
        x <= left + 0.6 || x >= right - 0.6 || y === 595 || y === 609 ? s.k : x < 345 ? s.W : s.cream,
      );
    }

  // her mast, snapped in two and lying on the sand across her bow, the shorter piece kicked askew
  const spars = [
    [333, 601, 349, 596],
    [350, 594, 361, 599],
  ] as const;
  const onSpar = (x: number, y: number): boolean =>
    spars.some(([ax, ay, bx, by]) => {
      const dx = bx - ax;
      const dy = by - ay;
      const along = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
      if (along < 0 || along > 1) return false;
      return Math.abs((x - ax) * dy - (y - ay) * dx) / Math.hypot(dx, dy) <= 1.2;
    });
  for (let y = 589; y <= 605; y++)
    for (let x = 331; x <= 363; x++) {
      if (!onSpar(x, y)) continue;
      put(x, y, !onSpar(x, y - 1) ? s.h : !onSpar(x, y + 1) ? s.k : s.d); // lit on top, outlined below
      if (!onSpar(x, y + 1)) p.shade(x, y + 2, 0.16); // a soft shadow on the sand
    }

  // weed clinging to her at the tide line
  for (const [x, n] of [
    [350, 3],
    [362, 4],
    [376, 2],
  ] as const) {
    const y0 = waterline(x) - 1;
    for (let j = 0; j < n; j++) {
      put(x + j, y0 + (j % 2), c.seaweed);
      if (j % 2 === 0) put(x + j, y0 - 1, c.seaweed);
    }
  }

  // foam where the swell breaks on her
  for (let x = x0; x < x0 + L; x++) {
    const i = x - x0;
    const y = waterline(x);
    if (y < cy + top(i) || y > cy + bottom(i)) continue; // only where she meets the water
    if (hash01(x, y, 4) < 0.75) p.put(x, y, c.foam);
    if (hash01(x, y, 6) < 0.25) p.put(x, y + 1, c.foam);
  }
}

// A starfish on a cleared pool's floor: five arms, lighter at the middle.
function starfish(p: Paint, s: Record<string, string>, x: number, y: number): void {
  p.put(x, y - 2, s.T);
  p.put(x, y + 2, s.T);
  p.put(x - 2, y, s.T);
  p.put(x + 2, y, s.t);
  p.put(x, y, s.T);
  for (const [dx, dy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const)
    p.put(x + dx, y + dy, s.t);
}

// An anemone: a pink foot with a crown of tentacles.
function anemone(p: Paint, s: Record<string, string>, x: number, y: number): void {
  p.put(x, y, s.P);
  for (const [dx, dy] of [
    [0, -1],
    [-1, -1],
    [1, -1],
    [-2, -2],
    [2, -2],
    [0, -2],
  ] as const)
    p.put(x + dx, y + dy, dy < -1 ? s.p : s.P);
}

// A crab on the wreck: a coral shell, eyes up and legs out.
function crab(p: Paint, s: Record<string, string>, x: number, y: number): void {
  p.hline(x - 2, x + 2, y + 1, s.r);
  p.hline(x - 1, x + 1, y + 2, s.T);
  p.put(x - 1, y, s.k);
  p.put(x + 1, y, s.k);
  for (const dx of [-3, -2, 2, 3]) p.put(x + dx, y + 2, s.T);
}

// A buoy bobbing at the wreck: a red and white ball on the water.
function buoy(p: Paint, s: Record<string, string>, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy > 5) continue;
      p.put(x + dx, y + dy, dx * dx + dy * dy >= 2 && (dy < 0 || dx > 0) ? s.W : s.r);
    }
  p.put(x, y - 3, s.k);
  p.put(x - 1, y + 3, s.W);
  p.put(x + 1, y + 3, s.W);
}

const drawPools: ShoreLair = (ctx, { c, s }, place, state) => {
  const cleared = state === "cleared";
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  paintAt(ctx, x0 - 4, y0 - 4, place.w * TILE + 8, place.h * TILE + 8, (p) => {
    for (const [cx, cy, rx, ry] of [
      [5.6, 75.2, 8, 5],
      [8.4, 76.6, 7, 4],
    ] as const)
      oval(
        p,
        cx * TILE,
        cy * TILE,
        rx,
        ry,
        (x, y) =>
          cleared
            ? (x + y) % 5 === 0
              ? c.crest
              : (x + y) % 3 === 0
                ? c.shallow2
                : c.shallow
            : (x + y) % 4 === 0
              ? s.z
              : s.N,
        s.k,
      );
    if (cleared) {
      starfish(p, s, 5.2 * TILE, 75.3 * TILE);
      starfish(p, s, 8.7 * TILE, 76.4 * TILE);
      anemone(p, s, 4.4 * TILE, 75.6 * TILE);
      anemone(p, s, 9.6 * TILE, 77.1 * TILE);
      anemone(p, s, 7.5 * TILE, 76.1 * TILE);
    }
    for (const [cx, cy, r] of [
      [4.6, 76.4, 5],
      [7.6, 77.1, 6],
      [9.6, 76.3, 4],
    ] as const)
      boulder(p, cx * TILE, cy * TILE, r, c, s);
  });
};

const drawWreck: ShoreLair = (ctx, { c, s }, place, state) => {
  const cx = (place.x + place.w / 2) * TILE;
  const cy = shoreYPx(cx) - 1;
  const pad = 40;
  paintAt(ctx, cx - pad, cy - pad, pad * 2, pad * 2, (p) => {
    wreck(p, c, s, cx, cy);
    if (state !== "cleared") return;
    // crabs move onto her broken sheer, and a buoy marks her
    crab(p, s, cx + 10, cy - 5);
    crab(p, s, cx + 20, cy - 3);
    buoy(p, s, cx - 36, shoreYPx(cx - 36) + 4);
  });
};

const drawLighthouse: ShoreLair = (ctx, { c, s }, place, state) => {
  const x = place.x * TILE + (place.w * TILE) / 2 - 7;
  const y = place.y * TILE + 11;
  paintAt(ctx, x - 8, y - 4, 30, 62, (p) => lighthouse(p, s, c, x, y, state === "cleared"));
};

export const SHORE_LAIRS: Record<"pools" | "wreck" | "lighthouse", ShoreLair> = {
  pools: drawPools,
  wreck: drawWreck,
  lighthouse: drawLighthouse,
};
