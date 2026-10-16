import { px } from "../../art/draw";
import { blobMask, paintAt, renderMask } from "../../art/paint";
import { village } from "../grid";
import { fbm } from "../noise";
import type { Feature } from "../scenery";
import { inVillage } from "./env";
import { leafColours } from "../weather";
import { arrow } from "./villageLife";

const item = (id: string) => ({ kind: "item", item: id }) as const;
const TREE_X = 504;
const TREE_Y = 470;

// Some found items bring a little scene with them (world pixels). `at` is the tile the map's hover names.
export const ITEM_SCENES: Feature[] = [
  // a big old tree south of your path, there from the start; the Knotted Rope adds the swing
  {
    id: "big-tree",
    land: [{ ...village(21, 29), w: 4, h: 5 }],
    unlock: { kind: "always" },
    draw: ({ ctx, c, s, season }) =>
      paintAt(ctx, TREE_X - 20, TREE_Y - 14, 44, 44, (p) => {
        const canopy = blobMask(36, 24, [
          [17, 11, 10],
          [8, 13, 7],
          [26, 13, 7],
          [12, 6, 7],
          [22, 6, 7],
          [17, 3, 6],
        ]);
        for (let y = 17; y < 24; y++)
          for (let x = 0; x < 36; x++)
            if (canopy.on(x, y)) p.shade(TREE_X - 17 + x + 3, TREE_Y - 12 + y + 14, 0.18);
        for (let y = TREE_Y + 5; y < TREE_Y + 24; y++) {
          const spread = 3 + Math.max(0, y - (TREE_Y + 19)) * 1.4;
          for (let x = Math.floor(TREE_X - spread); x <= Math.floor(TREE_X + spread); x++) {
            const t = (x - TREE_X) / spread;
            p.put(x, y, Math.abs(t) > 0.75 ? s.k : t < -0.2 ? s.d : s.o);
          }
        }
        for (let i = 0; i < 16; i++) {
          p.put(TREE_X + 3 + i, TREE_Y + 9 - Math.floor(i / 6), s.k);
          p.put(TREE_X + 3 + i, TREE_Y + 10 - Math.floor(i / 6), s.o); // the low branch
        }
        const leaf = { ...s, ...leafColours(season, s, c) };
        const shade = leaf.N ?? c.hedge3;
        renderMask(
          p,
          canopy,
          TREE_X - 17,
          TREE_Y - 12,
          { body: leaf.L, light: leaf.l, dark: shade, outline: s.k },
          (x, y, col) =>
            col === s.k
              ? col
              : season === "winter" && y < TREE_Y - 2 + fbm(x / 5, 0, 172) * 3
                ? leaf.l
                : fbm(x / 4, y / 4, 171) < 0.3
                  ? shade
                  : col,
        ); // snow on top in winter
      }),
  },
  {
    id: "swing",
    label: "a swing on the big old tree",
    land: [],
    unlock: item("knotted-rope"),
    at: village(24, 33),
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, TREE_X + 4, TREE_Y + 8, 20, 22, (p) => {
        for (const rx of [TREE_X + 10, TREE_X + 16]) p.vline(rx, TREE_Y + 9, TREE_Y + 21, s.h);
        p.hline(TREE_X + 9, TREE_X + 17, TREE_Y + 22, s.k);
        p.hline(TREE_X + 10, TREE_X + 16, TREE_Y + 21, s.d);
        for (let x = TREE_X + 6; x < TREE_X + 21; x++) {
          for (let y = TREE_Y + 24; y < TREE_Y + 27; y++)
            if ((x + y) % 2 === 0 && Math.abs(x - (TREE_X + 13)) < 7) p.put(x, y, c.path2); // worn grass
        }
      }),
  },
  // a writing desk and stool against the library wall, drawn over its old footprint
  {
    id: "ink-desk",
    label: "a writing desk by the library",
    land: [],
    unlock: item("ink-pot"),
    at: village(9, 17),
    draw: ({ ctx, s }) =>
      paintAt(ctx, 384, 350, 30, 22, (p) => {
        const [dx, dy] = [386, 358];
        for (let x = dx; x < dx + 16; x++) {
          p.put(x, dy, s.k);
          p.put(x, dy + 1, s.h);
          p.put(x, dy + 2, s.d);
          p.put(x, dy + 3, s.k);
        }
        for (const lx of [dx + 1, dx + 13]) {
          p.vline(lx, dy + 4, dy + 10, s.k);
          p.vline(lx + 1, dy + 4, dy + 10, s.o);
        }
        p.fill(dx + 3, dy - 2, 6, 2, s.W);
        p.hline(dx + 4, dx + 7, dy - 1, s.S);
        p.fill(dx + 11, dy - 3, 2, 3, s.n);
        p.put(dx + 11, dy - 4, s.k);
        p.put(dx + 12, dy - 5, s.W);
        p.put(dx + 13, dy - 6, s.W); // a quill in the ink
        p.fill(dx + 18, dy + 4, 5, 2, s.d);
        p.hline(dx + 18, dx + 22, dy + 3, s.k);
        p.vline(dx + 18, dy + 6, dy + 10, s.k);
        p.vline(dx + 22, dy + 6, dy + 10, s.k);
      }),
  },
  // a tray of seedlings with label sticks by the garden gate
  {
    id: "seedlings",
    label: "a tray of seedlings by the garden gate",
    land: [],
    unlock: item("seed-packet"),
    at: village(33, 22),
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, 582, 397, 18, 12, (p) => {
        const [sx, sy] = [584, 401];
        for (let x = sx; x < sx + 14; x++)
          for (let y = sy; y < sy + 5; y++)
            p.put(
              x,
              y,
              y === sy || y === sy + 4 || x === sx || x === sx + 13 ? s.k : y === sy + 1 ? s.d : c.soil,
            );
        for (let i = 0; i < 4; i++) {
          const x = sx + 2 + i * 3;
          p.put(x, sy - 1, c.hedge);
          p.put(x + 1, sy - 2, s.l);
          p.put(x - 1, sy - 2, s.l);
          p.vline(x, sy, sy + 1, c.hedge);
        }
        for (let i = 0; i < 3; i++) p.vline(sx + 2 + i * 4, sy + 5, sy + 6, s.W);
      }),
  },
  // two more arrows on the signpost: one to the forest, one to the mountains
  {
    id: "compass-arrows",
    label: "new arrows on the signpost",
    land: [],
    unlock: item("brass-compass"),
    at: village(36, 17),
    draw: ({ ctx, c, s }) =>
      paintAt(ctx, 594, 366, 34, 12, (p) => {
        arrow(p, s, 598, 369, 13, true, c.hedge2);
        arrow(p, s, 612, 374, 13, false, s.s);
      }),
  },
  // a little brass telescope on your roof
  {
    id: "roof-telescope",
    label: "a telescope on your roof",
    land: [],
    unlock: item("telescope-lens"),
    at: village(11, 24),
    draw: ({ ctx, s }) =>
      inVillage(ctx, () => {
        for (let i = 0; i < 7; i++) px(ctx, i < 1 ? s.k : s.a, 90 + i, 192 - Math.floor(i / 2), 2, 2);
        px(ctx, s.k, 92, 194, 1, 3);
        px(ctx, s.k, 90, 196, 5, 1);
      }),
  },
];
