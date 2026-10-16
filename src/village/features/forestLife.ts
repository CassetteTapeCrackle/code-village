import { px, stamp } from "../../art/draw";
import { BIRDHOUSE, MUSHROOM, STUMP } from "../../art/sprites";
import { TILE } from "../grid";
import type { Feature } from "../scenery";

const forest = (id: string, land: Feature["land"], draw: Feature["draw"]): Feature => ({
  id,
  land,
  unlock: { kind: "always" },
  draw,
  afterTrees: true,
});

// The forest's everyday things (world pixels), drawn after the trees: a woodpile with an axe by the cabin,
// stumps, a birdhouse, a ring of mushrooms.
export const FOREST_LIFE: Feature[] = [
  forest("forest-woodpile", [{ x: 24, y: 42, w: 3, h: 2 }], ({ ctx, s }) => {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3 - row; i++) {
        const x = 196 + i * 4 + row * 2;
        const y = 346 - row * 3;
        px(ctx, s.k, x, y, 4, 4);
        px(ctx, s.h, x + 1, y + 1, 2, 2);
      }
    }
    stamp(ctx, STUMP, s, 210, 344);
    px(ctx, s.o, 213, 338, 1, 7); // the axe's handle
    px(ctx, s.k, 211, 337, 4, 2);
    px(ctx, s.S, 211, 337, 3, 1); // its head
  }),
  forest(
    "stumps",
    [
      { x: 9, y: 47, w: 1, h: 1 },
      { x: 25, y: 40, w: 1, h: 1 },
      { x: 30, y: 46, w: 1, h: 1 },
    ],
    ({ ctx, s }) => {
      for (const [x, y] of [
        [9, 47],
        [25, 40],
        [30, 46],
      ])
        stamp(ctx, STUMP, s, x * TILE, y * TILE + 2);
    },
  ),
  forest("birdhouse", [{ x: 10, y: 43, w: 1, h: 1 }], ({ ctx, s }) => {
    stamp(ctx, BIRDHOUSE, s, 10 * TILE, 43 * TILE - 3);
  }),
  forest("mushroom-ring", [{ x: 18, y: 53, w: 2, h: 2 }], ({ ctx, s }) => {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      stamp(
        ctx,
        MUSHROOM,
        s,
        Math.round(19 * TILE + Math.cos(a) * 6) - 2,
        Math.round(54 * TILE + Math.sin(a) * 5) - 2,
      );
    }
  }),
];
