import type { MapColors } from "../../art/palette";
import { blobMask, painter, renderMask, type Paint } from "../../art/paint";
import { TILE } from "../grid";
import type { Place } from "../layout";
import { valueNoise } from "../noise";
import type { LairState } from "../render";
import { nearRangeHeightPx, rangeFootPx } from "../terrain";

// The observatory and the mountain lairs, ported from the world-pass mockup (buildings.py). Light from the upper left.
type Colors = { c: MapColors; s: Record<string, string> };

export function drawObservatory(ctx: CanvasRenderingContext2D, { c, s }: Colors, place: Place): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const p = painter(ctx, x0 - 4, y0 - 4, place.w * TILE + 8, place.h * TILE + 8);
  const cx = x0 + 32;
  const hw = 25;
  for (let x = cx - hw; x <= cx + hw; x++) {
    const t = (x - cx) / hw;
    const bend = 2 * Math.sqrt(Math.max(0, 1 - t * t));
    const top = Math.floor(y0 + 28 + bend);
    const bot = Math.floor(y0 + 52 + bend);
    const light = -t * 0.9 + 0.25 - t * t * 0.4;
    const tone = light > 0.45 ? c.stone : light > -0.1 ? s.s : light > -0.55 ? c.stone2 : s.S;
    for (let y = top; y <= bot; y++) {
      const seam = (y - y0) % 5 === 0 || (x - cx + Math.floor((y - y0) / 5) * 4) % 9 === 0;
      p.put(
        x,
        y,
        x === cx - hw || x === cx + hw || y === bot ? s.k : seam ? (tone !== s.S ? s.S : c.rock2) : tone,
      );
    }
  }
  for (let y = y0 + 40; y < y0 + 55; y++) {
    for (let x = cx - 6; x < cx + 7; x++) {
      const ay = y0 + 46 - Math.sqrt(Math.max(0, 36 - (x - cx) ** 2));
      if (y < ay) continue;
      p.put(x, y, Math.abs(x - cx) === 6 || y < ay + 1 ? s.k : (x - cx) % 3 ? s.d : s.o);
    }
  }
  p.put(cx + 3, y0 + 48, s.a);
  for (const wx of [cx - 17, cx + 14]) {
    p.fill(wx, y0 + 36, 4, 6, s.k);
    p.fill(wx + 1, y0 + 37, 2, 4, c.windowGlow);
    p.put(wx + 1, y0 + 37, s.W);
  }
  for (let x = cx - hw - 3; x <= cx + hw + 3; x++) {
    const t = (x - cx) / (hw + 3);
    const yb = Math.floor(y0 + 27 + 2 * Math.sqrt(Math.max(0, 1 - t * t)));
    p.put(x, yb - 1, s.k);
    p.put(x, yb, s.W);
    p.put(x, yb + 1, c.stone2);
    p.put(x, yb + 2, s.k);
    p.put(x, yb - 5, s.k);
    if ((x - cx) % 4 === 0) p.vline(x, yb - 5, yb - 1, s.k);
  }
  const dcy = y0 + 26;
  const rx = 24;
  const ry = 23;
  for (let y = dcy - ry; y <= dcy; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - dcy) / ry;
      const rr = nx * nx + ny * ny;
      if (rr > 1) continue;
      const nz = Math.sqrt(1 - rr);
      const d = -0.55 * nx - 0.6 * ny + 0.58 * nz;
      let col: string;
      if (rr > 0.9) col = s.k;
      else {
        col = d > 0.82 ? s.i : d > 0.45 ? s.b : d > 0.15 ? s.z : s.Z;
        const phi = Math.atan2(nx, nz);
        if (Math.abs(Math.sin(phi * 4)) < 0.1 || Math.abs(ny + 0.55) < 0.025) col = col !== s.Z ? s.Z : s.k;
        if (Math.abs(x - (cx + 4)) <= 2 && y < dcy - 3) col = Math.abs(x - (cx + 4)) < 2 ? s.k : s.Z; // the slit
      }
      p.put(x, y, col);
    }
  }
  for (let i = 0; i < 8; i++) {
    const tx = cx + 4 + Math.floor(i / 2);
    const ty = dcy - ry + 4 - i;
    p.put(tx, ty, s.s);
    p.put(tx + 1, ty, s.W);
    p.put(tx + 2, ty, s.k);
  }
  p.flush();
}

// The old mine in its rock outcrop: boarded up while it sleeps, eyes in the dark when awake, lit with its cart when beaten.
export function drawMine(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const p = painter(ctx, x0 - 2, y0, place.w * TILE + 8, place.h * TILE + 4);
  const mask = blobMask(
    60,
    44,
    [
      [30, 26, 20],
      [14, 32, 12],
      [46, 31, 13],
      [24, 16, 11],
      [38, 18, 10],
    ],
    38,
  );
  renderMask(
    p,
    mask,
    x0,
    y0 + 10,
    { body: c.rock, light: c.rock3, dark: c.rock2, outline: s.k },
    (x, y, col) => {
      if (col === s.k) return col;
      const t = (x - (x0 + 30)) / 30;
      return valueNoise(x / 2.5, y / 6, 111) > 0.8 ? s.S : t < -0.35 ? c.rock3 : t < 0.3 ? c.rock : c.rock2;
    },
  );
  for (let x = x0; x < x0 + 60; x++) p.put(x, y0 + 47, x % 2 ? c.rock2 : c.rock);
  const ex = x0 + 30;
  const ey = y0 + 26;
  const bottom = (place.y + place.h) * TILE;
  for (let y = ey; y < bottom; y++) {
    for (let x = ex - 7; x < ex + 8; x++) {
      const ay = ey + 6 - Math.sqrt(Math.max(0, 49 - (x - ex) ** 2));
      if (y >= ay) p.put(x, y, Math.abs(x - ex) > 3 || y < ay + 3 ? s.k : y < ey + 14 ? s.n : s.k);
    }
  }
  for (const x of [ex - 9, ex + 7]) {
    p.vline(x, ey + 2, bottom - 1, s.k);
    p.vline(x + 1, ey + 2, bottom - 1, s.o);
    p.vline(x + 2, ey + 2, bottom - 1, s.k);
  }
  for (let x = ex - 10; x <= ex + 10; x++)
    for (let y = ey; y < ey + 4; y++)
      p.put(x, y, y === ey || y === ey + 3 || Math.abs(x - ex) === 10 ? s.k : s.o);
  for (let y = ey + 16; y < bottom; y++) {
    if (y % 3 === 0) p.hline(ex - 4, ex + 4, y, s.o);
    p.put(ex - 3, y, s.S);
    p.put(ex + 3, y, s.S);
  }
  const lit = state === "cleared";
  p.put(ex + 11, ey + 4, s.k);
  p.put(ex + 11, ey + 5, lit ? s.y : s.S);
  p.put(ex + 11, ey + 6, lit ? s.a : s.k);
  if (lit) {
    for (let y = ey + 18; y < ey + 25; y++)
      for (let x = ex - 5; x <= ex + 5; x++)
        p.put(x, y, y === ey + 18 || y === ey + 24 || Math.abs(x - ex) === 5 ? s.k : x < ex ? s.s : s.S);
    for (let x = ex - 4; x <= ex + 4; x++) p.put(x, ey + 17, x % 2 ? s.a : s.y);
    p.put(ex - 3, ey + 25, s.k);
    p.put(ex + 3, ey + 25, s.k);
  } else if (state === "awake") {
    p.put(ex - 2, ey + 10, s.a);
    p.put(ex + 2, ey + 10, s.a); // eyes in the dark
  } else {
    for (let i = 0; i < 12; i++) {
      p.put(ex - 6 + i, ey + 6 + i, s.d);
      p.put(ex + 5 - i, ey + 6 + i, s.d); // two planks across the entrance
    }
  }
  p.flush();
}

const windStreaks = (p: Paint, s: Record<string, string>, x: number, y: number): void => {
  for (let i = 0; i < 3; i++) for (let k = 0; k < 9; k++) if (k !== 3) p.put(x + i * 7 + k, y + i * 6, s.W);
};

// The windy ridge: a bare rock spur in the wind, and a lookout on stilts once it is beaten.
export function drawRidge(
  ctx: CanvasRenderingContext2D,
  { c, s }: Colors,
  place: Place,
  state: LairState,
): void {
  const x0 = place.x * TILE;
  const y0 = place.y * TILE;
  const cx = x0 + 36;
  const p = painter(ctx, x0 - 4, y0 - 4, place.w * TILE + 8, place.h * TILE + 8);
  const mask = blobMask(
    56,
    20,
    [
      [28, 14, 12],
      [16, 16, 9],
      [40, 16, 9],
    ],
    15,
  );
  renderMask(p, mask, cx - 28, y0 + 40, { body: c.rock, light: c.rock3, dark: c.rock2, outline: s.k });
  for (let x = cx - 28; x < cx + 28; x++)
    if (mask.on(x - (cx - 28), 14)) p.put(x, y0 + 54, x % 2 ? c.rock2 : c.rock);
  if (state !== "cleared") {
    windStreaks(p, s, cx - 16, y0 + 14);
    p.flush();
    return;
  }
  for (const sx of [cx - 18, cx - 2, cx + 16]) {
    p.vline(sx, y0 + 33, y0 + 49, s.k);
    p.vline(sx + 1, y0 + 33, y0 + 49, s.o);
    p.vline(sx + 2, y0 + 33, y0 + 49, s.k);
  }
  for (let i = 0; i < 14; i++) {
    p.put(cx - 17 + i, y0 + 36 + Math.floor(i / 2), s.k);
    p.put(cx + 16 - i, y0 + 36 + Math.floor(i / 2), s.k);
  }
  for (let x = cx - 22; x <= cx + 22; x++) {
    for (let y = y0 + 29; y < y0 + 34; y++)
      p.put(x, y, y === y0 + 29 || y === y0 + 33 || Math.abs(x - cx) === 22 ? s.k : y < y0 + 31 ? s.h : s.o);
    p.put(x, y0 + 23, s.k);
    p.put(x, y0 + 26, s.o);
    if ((x - cx) % 5 === 0) p.vline(x, y0 + 23, y0 + 29, s.k);
  }
  const tx = cx - 8;
  const ty = y0 + 28;
  for (let i = 0; i < 5; i++) {
    p.put(tx - Math.floor(i / 2), ty - i, s.k);
    p.put(tx + Math.floor(i / 2), ty - i, s.k);
  }
  for (let i = 0; i < 10; i++) {
    p.put(tx - 4 + i, ty - 6 - Math.floor(i / 2), s.s);
    p.put(tx - 4 + i, ty - 7 - Math.floor(i / 2), s.W);
    p.put(tx - 4 + i, ty - 5 - Math.floor(i / 2), s.k);
  }
  p.vline(cx + 18, y0 + 6, y0 + 29, s.k);
  for (let y = y0 + 6; y < y0 + 13; y++) {
    for (let x = cx + 19; x < cx + 22 + (7 - Math.abs(y - (y0 + 9))); x++)
      p.put(x, y, y < y0 + 9 ? s.r : s.R);
  }
  for (let y = y0 + 34; y < (place.y + place.h) * TILE + 2; y++) {
    p.put(cx + 2, y, s.k);
    p.put(cx + 6, y, s.k);
    if (y % 3 === 0) p.hline(cx + 3, cx + 5, y, s.d);
  }
  p.flush();
}

// The peak's summit is the near range's tallest point (drawn with the range): this finds it.
export function summit(): { x: number; y: number } {
  let best = 700;
  const top = (x: number): number => rangeFootPx(x) - nearRangeHeightPx(x);
  for (let x = 700; x < 736; x++) if (top(x) < top(best)) best = x;
  return { x: best, y: Math.floor(top(best)) };
}

// The peak: wind across the summit while its boss is awake, a pennant and a cairn once beaten.
export function drawPeak(ctx: CanvasRenderingContext2D, { s }: Colors, state: LairState): void {
  const top = summit();
  const p = painter(ctx, top.x - 48, 0, 80, top.y + 40);
  if (state === "awake") windStreaks(p, s, top.x - 14, top.y + 6);
  if (state === "cleared") {
    // the summit touches the map's top edge, so the pennant stands a little below it, all of it on the map
    p.vline(top.x + 3, top.y + 5, top.y + 17, s.k);
    p.fill(top.x + 4, top.y + 5, 6, 4, s.r);
    p.hline(top.x + 4, top.x + 9, top.y + 8, s.R);
    // the cairn sits down the slope where all of it fits under the edge: its base is the slope's lowest point under it
    const baseAt = (cx: number): number => {
      let base = 0;
      for (let x = cx - 4; x <= cx + 4; x++)
        base = Math.max(base, Math.floor(rangeFootPx(x) - nearRangeHeightPx(x)) + 2);
      return base;
    };
    let cx = top.x - 9;
    while (baseAt(cx) < 13 && cx > top.x - 40) cx--;
    const base = baseAt(cx);
    for (const [dx, dy, w] of [
      [0, 0, 9],
      [1, -3, 7],
      [2, -6, 5],
      [3, -8, 3],
    ]) {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < 3; y++)
          p.put(
            cx - 4 + dx + x,
            base - 2 + dy + y,
            y === 2 || x === 0 || x === w - 1 || (dy === -8 && y === 0) ? s.k : x < w / 2 ? s.s : s.S,
          );
      }
    }
  }
  p.flush();
}
