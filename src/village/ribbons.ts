import { TILE } from "./grid";
import type { VillageMap } from "./layout";
import { fbm, valueNoise } from "./noise";
import { cliffRow } from "./terrain";

// Paths drawn as soft, bending ribbons over the walkable tiles (walking stays tile based).
// Ported from the world-pass mockup (paths.py).
const PATH = "=PG#";
const PLAZA_CENTRE = { x: 68 * TILE + 4, y: 46 * TILE + 4 };
const isPath = (map: VillageMap, x: number, y: number): boolean =>
  y >= 0 && y < map.h && x >= 0 && x < map.w && PATH.includes(map.tiles[y][x]);
const isMain = (x: number, y: number): boolean => y === 14 || y === 46 || (x === 78 && y >= 14 && y <= 46);

// A tile's point on the ribbon: its centre, nudged by noise, pulled inwards at a corner. Bridges, doors, the plaza
// and the cliff steps keep the exact centre so the ribbon meets them square.
export function pathNode(map: VillageMap, tx: number, ty: number): { x: number; y: number } {
  const cx = tx * TILE + 3.5;
  const cy = ty * TILE + 3.5;
  const t = map.tiles[ty][tx];
  const nearBridge = [-2, -1, 1, 2].some((d) => map.tiles[ty][tx + d] === "#");
  const h = [-1, 1].filter((d) => isPath(map, tx + d, ty));
  const v = [-1, 1].filter((d) => isPath(map, tx, ty + d));
  // a door is where the path meets the building, not every tile of a path running along its front
  const atDoor = ty > 0 && map.tiles[ty - 1][tx] === "B" && (h.length < 2 || v.length > 0);
  if (t === "#" || t === "P" || nearBridge || atDoor || Math.abs(ty - cliffRow(tx)) <= 1)
    return { x: cx, y: cy };
  const amp = 3.4;
  let dx = amp * (2 * fbm(tx / 3.5, ty / 3.5, 91) - 1);
  let dy = amp * (2 * fbm(tx / 3.5, ty / 3.5, 92) - 1);
  if (h.length === 1 && v.length === 1) {
    dx += 2.6 * h[0];
    dy += 2.6 * v[0];
  }
  return { x: cx + dx, y: cy + dy };
}

export type PathMask = {
  width: number;
  height: number;
  inside: Uint8Array;
  dist: Float32Array;
  main: Uint8Array;
  plaza: Uint8Array;
};

export function pathMask(map: VillageMap): PathMask {
  const width = map.w * TILE;
  const height = map.h * TILE;
  const dist = new Float32Array(width * height).fill(99);
  const half = new Float32Array(width * height);
  const main = new Uint8Array(width * height);
  const capsule = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    hw: number,
    isMainRoad: boolean,
  ): void => {
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x) - 7));
    const x1 = Math.min(width, Math.ceil(Math.max(a.x, b.x) + 8));
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y) - 7));
    const y1 = Math.min(height, Math.ceil(Math.max(a.y, b.y) + 8));
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = Math.max(1e-6, vx * vx + vy * vy);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / len2));
        const d = Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
        const i = y * width + x;
        if (d < dist[i]) {
          dist[i] = d;
          half[i] = hw;
          main[i] = isMainRoad ? 1 : 0;
        }
      }
    }
  };
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (!isPath(map, tx, ty)) continue;
      const here = pathNode(map, tx, ty);
      let linked = false;
      for (const [nx, ny] of [
        [tx + 1, ty],
        [tx, ty + 1],
      ]) {
        if (!isPath(map, nx, ny)) continue;
        const both = isMain(tx, ty) && isMain(nx, ny);
        capsule(here, pathNode(map, nx, ny), both ? 4.1 : 3.2, both);
        linked = true;
      }
      if (
        !linked &&
        ![
          [-1, 0],
          [0, -1],
        ].some(([dx, dy]) => isPath(map, tx + dx, ty + dy))
      )
        capsule(here, here, 3.2, false);
    }
  }
  const inside = new Uint8Array(width * height);
  const plaza = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const wob = (valueNoise(x / 24, y / 24, 93) - 0.5) * 1.4;
      if (dist[i] < half[i] + wob) inside[i] = 1;
      if (Math.hypot(x + 0.5 - PLAZA_CENTRE.x, (y + 0.5 - PLAZA_CENTRE.y) * 1.25) < 21) {
        inside[i] = 1;
        plaza[i] = 1;
      }
    }
  }
  roundInsideCorners(inside, dist, half, width, height);
  return { width, height, inside, dist, main, plaza };
}

// A closing (grow by 4, then shrink by 4) fills the sharp inside corners of the ribbon with a curve.
function roundInsideCorners(
  inside: Uint8Array,
  dist: Float32Array,
  half: Float32Array,
  width: number,
  height: number,
): void {
  const R = 4;
  const grown = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && dist[y * width + x] < half[y * width + x] + R;
  const disc: [number, number][] = [];
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) disc.push([dx, dy]);
  const add: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (inside[i] || !grown(x, y)) continue;
      if (disc.every(([dx, dy]) => grown(x + dx, y + dy))) add.push(i);
    }
  }
  for (const i of add) inside[i] = 1;
}
