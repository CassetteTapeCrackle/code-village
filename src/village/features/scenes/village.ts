import { paintAt } from "../../../art/paint";
import { BUG_HOTEL, DOG, KENNEL, OVEN, PENNANT, RACK, SIGN } from "../../../art/scenes";
import { stamp } from "../../../art/draw";
import { TILE } from "../../grid";
import type { Feature } from "../../scenery";
import { onTile, scene } from "./common";

// The doors that get a carved name sign once the Carved Nameplate is found: school, library, house, cabin, observatory.
const DOORS: readonly [number, number][] = [
  [68, 40],
  [51, 46],
  [53, 57],
  [17, 44],
  [74, 12],
];

export const VILLAGE_SCENES: Feature[] = [
  scene(
    "kennel",
    "tin-whistle",
    { x: 47, y: 57 },
    "a dog in a kennel in your yard",
    [{ x: 47, y: 57, w: 2, h: 1 }],
    ({ ctx, s }) => {
      onTile(ctx, s, KENNEL, 47, 57);
      onTile(ctx, s, DOG, 48, 57, 3);
    },
  ),
  scene(
    "hopscotch",
    "slate-grid",
    { x: 65, y: 40 },
    "a hopscotch grid in the schoolyard",
    [{ x: 64, y: 40, w: 4, h: 2 }],
    ({ ctx, s }) =>
      paintAt(ctx, 64 * TILE, 40 * TILE, 34, 16, (p) => {
        for (const [cx, cy] of [
          [0, 3],
          [6, 3],
          [12, 0],
          [12, 6],
          [18, 3],
          [24, 0],
          [24, 6],
        ]) {
          const x0 = 64 * TILE + 2 + cx;
          const y0 = 40 * TILE + 4 + cy;
          for (let k = 0; k < 6; k++) {
            p.put(x0 + k, y0, s.W);
            p.put(x0 + k, y0 + 5, s.W);
            p.put(x0, y0 + k, s.W);
            p.put(x0 + 5, y0 + k, s.W);
          }
        }
      }),
  ),
  scene(
    "bread-oven",
    "recipe-card",
    { x: 63, y: 48 },
    "Lou's bread oven by the square",
    [{ x: 62, y: 48, w: 3, h: 1 }],
    ({ ctx, s }) => {
      onTile(ctx, s, OVEN, 62, 48, 2);
      onTile(ctx, s, RACK, 64, 48, 1);
    },
  ),
  scene(
    "bug-hotel",
    "magnifying-glass",
    { x: 69, y: 53 },
    "a bug hotel against the garden fence",
    [{ x: 69, y: 52, w: 1, h: 2 }],
    ({ ctx, s }) => onTile(ctx, s, BUG_HOTEL, 69, 53, 2),
  ),
  scene(
    "name-signs",
    "carved-nameplate",
    { x: 16, y: 44 },
    "a carved name sign by every door",
    [],
    ({ ctx, s }) => {
      for (const [dx, dy] of DOORS) stamp(ctx, SIGN, s, dx * TILE - 7, dy * TILE - 6);
    },
  ),
  scene(
    "pennant",
    "summit-pennant",
    { x: 49, y: 51 },
    "the summit pennant flying at your house",
    [{ x: 49, y: 50, w: 1, h: 2 }],
    ({ ctx, s }) => stamp(ctx, PENNANT, s, 49 * TILE + 2, 51 * TILE - 4),
  ),
];
