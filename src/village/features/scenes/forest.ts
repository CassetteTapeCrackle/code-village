import { stamp } from "../../../art/draw";
import { paintAt } from "../../../art/paint";
import { BIRDHOUSE_POLE, SAPLING, STAND, TOWER, WORKBENCH } from "../../../art/scenes";
import { PINE } from "../../../art/sprites";
import { TILE } from "../../grid";
import type { Feature } from "../../scenery";
import { pond } from "../water";
import { onTile, scene } from "./common";

const POND = { cx: 30.5 * TILE, cy: 34.2 * TILE, rx: 2.6 * TILE, ry: 1.5 * TILE };
const LANTERN_POSTS = [21, 25, 29, 33, 37].map((tx) => tx * TILE);
const LANTERN_Y = 46 * TILE - 3;

export const FOREST_SCENES: Feature[] = [
  scene(
    "reflecting-pond",
    "twin-pinecones",
    { x: 30, y: 34 },
    "a still pond where a pine and its reflection look alike",
    [{ x: 27, y: 32, w: 6, h: 4 }],
    ({ ctx, c, s, palette }) => {
      pond(ctx, c, s, { ...POND, seed: 4, lily: true, rim: "sand", night: palette === "night" });
      const px = Math.floor(POND.cx) - 4;
      const top = Math.floor(POND.cy - POND.ry) - 9;
      stamp(ctx, PINE, s, px, top);
      stamp(ctx, [...PINE].reverse(), { ...s, k: s.Z, L: s.z, l: s.i, o: s.Z }, px, top + 10); // the reflection
    },
  ),
  scene(
    "lantern-line",
    "shared-lantern-hook",
    { x: 25, y: 45 },
    "lanterns along the forest road, all on one line",
    LANTERN_POSTS.map((x) => ({ x: x / TILE, y: 45, w: 1, h: 1 })),
    ({ ctx, c, s, palette }) =>
      paintAt(
        ctx,
        LANTERN_POSTS[0] - 9,
        LANTERN_Y - 18,
        LANTERN_POSTS[4] - LANTERN_POSTS[0] + 18,
        26,
        (p) => {
          for (const x of LANTERN_POSTS) {
            p.vline(x, LANTERN_Y - 8, LANTERN_Y + 1, s.o);
            p.put(x, LANTERN_Y - 9, s.k);
          }
          for (let i = 1; i < LANTERN_POSTS.length; i++) {
            const a = LANTERN_POSTS[i - 1];
            const b = LANTERN_POSTS[i];
            for (let x = a; x <= b; x++) {
              const sag = Math.floor(3 * Math.sin((Math.PI * (x - a)) / (b - a)));
              p.put(x, LANTERN_Y - 8 + sag, s.k);
              if ((x - a) % 8 !== 4) continue;
              if (palette === "night")
                for (let dy = -3; dy <= 3; dy++)
                  for (let dx = -3; dx <= 3; dx++)
                    if (dx * dx + dy * dy <= 9) p.put(x + dx, LANTERN_Y - 5 + sag + dy, c.firefly);
              p.put(x, LANTERN_Y - 7 + sag, s.k);
              p.put(x, LANTERN_Y - 6 + sag, s.a);
              p.put(x, LANTERN_Y - 5 + sag, s.y);
            }
          }
        },
      ),
  ),
  scene(
    "trailhead",
    "bark-ledger",
    { x: 36, y: 45 },
    "a check-in ledger at the trailhead",
    [{ x: 36, y: 44, w: 2, h: 2 }],
    ({ ctx, s }) => onTile(ctx, s, STAND, 36, 45, 3),
  ),
  scene(
    "birdhouses",
    "ranked-feathers",
    { x: 11, y: 48 },
    "birdhouses in height order, birds landing smallest first",
    [{ x: 10, y: 47, w: 3, h: 2 }],
    ({ ctx, s }) => {
      const base = 48 * TILE + 6;
      const poles: [number, string][] = [
        [8, s.b],
        [11, s.r],
        [14, s.y],
      ];
      paintAt(ctx, 10 * TILE - 2, 46 * TILE - 2, 30, 26, (p) =>
        poles.forEach(([height], i) => p.vline(10 * TILE + i * 8 + 2, base - height, base, s.o)),
      );
      poles.forEach(([height], i) => stamp(ctx, BIRDHOUSE_POLE, s, 10 * TILE + i * 8, base - height - 6));
      paintAt(ctx, 10 * TILE - 2, 46 * TILE - 2, 30, 26, (p) =>
        poles.forEach(([height, bird], i) => {
          for (let k = 0; k <= i; k++) p.put(10 * TILE + i * 8 + 1 + k, base - height - 8, bird); // birds, smallest perch lowest
        }),
      );
    },
  ),
  scene(
    "young-oak",
    "family-tree-sketch",
    { x: 28, y: 32 },
    "a young oak beside the ancient one",
    [{ x: 28, y: 31, w: 2, h: 2 }],
    ({ ctx, s }) => {
      onTile(ctx, s, SAPLING, 28, 32, 1, -2);
      paintAt(ctx, 28 * TILE - 3, 32 * TILE, 16, 10, (p) => {
        for (let x = 28 * TILE - 2; x < 28 * TILE + 12; x++)
          for (const y of [32 * TILE + 1, 33 * TILE + 1]) p.put(x, y, x % 3 ? s.W : s.k);
        p.vline(28 * TILE - 2, 32 * TILE + 1, 33 * TILE + 1, s.W);
        p.vline(28 * TILE + 11, 32 * TILE + 1, 33 * TILE + 1, s.W); // a picket pen
      });
    },
  ),
  scene(
    "workbench",
    "toolbelt",
    { x: 21, y: 42 },
    "a workbench by the ranger's cabin",
    [{ x: 21, y: 42, w: 2, h: 1 }],
    ({ ctx, s }) => onTile(ctx, s, WORKBENCH, 21, 42, 2),
  ),
  scene(
    "lookout-tower",
    "rangers-whistle",
    { x: 34, y: 59 },
    "a lookout tower at the forest's south edge",
    [{ x: 34, y: 57, w: 2, h: 3 }],
    ({ ctx, s }) => onTile(ctx, s, TOWER, 34, 59),
  ),
];
