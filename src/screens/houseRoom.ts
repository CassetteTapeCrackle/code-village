import { stamp } from "../art/draw";
import { SPRITE_COLORS } from "../art/palette";
import { TROPHY_SPRITES } from "../art/trophies";
import type { Palette } from "../village/clock";
import { ITEM_SPRITES } from "../village/destinies";

// The house's one room (world-pass mockup section 5): a place for each of the eight home items.
export const ROOM_W = 160;
export const ROOM_H = 72;

// Where each home item sits: its sprite's top-left corner in room pixels.
export const HOME_SPOTS: Record<string, { x: number; y: number; where: string }> = {
  "acorn-badge": { x: 20, y: 20, where: "on the coat by the door" },
  "whittled-spoon": { x: 34, y: 16, where: "hanging over the stove" },
  "slot-tray": { x: 52, y: 20, where: "on the spice rack" },
  "pebble-counter": { x: 77, y: 25, where: "on the windowsill" },
  "field-logbook": { x: 72, y: 33, where: "open on the desk" },
  "abacus-beads": { x: 82, y: 34, where: "on the desk" },
  "nesting-dolls": { x: 104, y: 12, where: "on the mantel" },
  "weaving-loom": { x: 130, y: 26, where: "in the corner, with its rug" },
};

export function drawHouseRoom(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  width: number,
  found: ReadonlySet<string>,
  trophies: readonly string[],
): void {
  const s = SPRITE_COLORS[palette];
  const night = palette === "night";
  const fill = (color: string, x: number, y: number, w: number, h: number): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  // wall, wainscot, plank floor
  fill(s.w, 0, 0, width, 36);
  for (let x = 3; x < width; x += 8) for (let y = 2; y < 34; y += 5) fill(s.y, x, y, 1, 1);
  fill(s.C, 0, 35, width, 1);
  fill(s.c, 0, 36, width, 8);
  for (let x = 6; x < width; x += 14) fill(s.C, x, 38, 8, 4);
  fill(s.s, 0, 44, width, 1);
  for (let x = 0; x < width; x++) fill(x % 14 === 0 ? s.k : x % 2 ? s.o : s.d, x, 45, 1, ROOM_H - 45);
  for (let y = 52; y < ROOM_H; y += 7) fill(s.o, 0, y, width, 1);

  // the door, and the coat on its hook
  fill(s.k, 4, 14, 15, 31);
  fill(s.d, 5, 15, 13, 30);
  fill(s.o, 11, 15, 1, 30);
  fill(s.a, 15, 30, 2, 2);
  fill(s.k, 21, 17, 4, 1);
  fill(s.k, 19, 18, 10, 14);
  fill(s.b, 20, 19, 8, 12); // the coat

  // the stove with a pot, and the spice rack above
  fill(s.k, 28, 26, 21, 19);
  fill(s.S, 29, 27, 19, 17);
  fill(s.k, 32, 34, 13, 8);
  fill(night ? s.a : s.r, 34, 37, 9, 4); // the grate's glow
  fill(s.k, 34, 22, 9, 4);
  fill(s.s, 35, 23, 7, 2); // the pot
  fill(s.k, 37, 0, 3, 22); // the pipe
  fill(s.k, 50, 18, 17, 1);
  fill(s.k, 50, 25, 17, 1);
  fill(s.d, 50, 26, 17, 1);

  // a trophy shelf over the kitchen (three trophies), and a second one past the loom when the room is wide enough
  fill(s.k, 26, 13, 41, 2);
  fill(s.d, 26, 13, 41, 1);
  const extra = Math.max(0, Math.floor((width - 158) / 13));
  if (extra > 0) {
    fill(s.k, 154, 13, extra * 13 + 2, 2);
    fill(s.d, 154, 13, extra * 13 + 2, 1);
  }
  const shown = trophies.slice(-(3 + extra));
  shown.forEach((id, i) => {
    const grid = TROPHY_SPRITES[id];
    if (!grid) return;
    const x = i < 3 ? 28 + i * 13 : 155 + (i - 3) * 13;
    stamp(ctx, grid, s, x, 13 - grid.length);
  });

  // the window with its curtains and sill, the desk under it with a shelf of notebooks
  fill(s.k, 70, 6, 23, 21);
  fill(night ? s.Z : s.i, 71, 7, 21, 19);
  if (night) fill(s.y, 86, 10, 1, 1);
  else fill(s.W, 74, 10, 6, 2);
  fill(s.k, 81, 7, 1, 19);
  fill(s.k, 71, 16, 21, 1);
  fill(s.r, 68, 5, 3, 24);
  fill(s.r, 92, 5, 3, 24);
  fill(s.k, 68, 30, 27, 2);
  fill(s.d, 68, 30, 27, 1);
  fill(s.k, 70, 39, 23, 2);
  fill(s.h, 70, 39, 23, 1);
  fill(s.k, 71, 41, 2, 4);
  fill(s.k, 90, 41, 2, 4);

  // the fireplace and the mirror above it
  fill(s.k, 98, 18, 25, 27);
  for (let y = 19; y < 44; y += 3)
    for (let x = 99; x < 122; x += 4) fill((x + y) % 7 ? s.s : s.S, x + (y % 2) * 2, y, 3, 2);
  fill(s.k, 104, 30, 13, 14);
  fill(s.a, 106, 36, 9, 8);
  fill(s.r, 108, 39, 5, 5);
  fill(s.y, 109, 34, 2, 3);
  fill(s.k, 96, 18, 29, 2);
  fill(s.h, 96, 18, 29, 1); // the mantel
  fill(s.k, 106, 3, 9, 9);
  fill(s.i, 107, 4, 7, 7);
  fill(s.W, 108, 5, 2, 2);

  // home items in their places, or a dotted outline where one will go
  const outline = (x: number, y: number, w: number, h: number): void => {
    for (let i = 0; i < w; i += 2) {
      fill(s.C, x + i, y, 1, 1);
      fill(s.C, x + i, y + h - 1, 1, 1);
    }
    for (let j = 0; j < h; j += 2) {
      fill(s.C, x, y + j, 1, 1);
      fill(s.C, x + w - 1, y + j, 1, 1);
    }
  };
  for (const [id, spot] of Object.entries(HOME_SPOTS)) {
    if (id === "weaving-loom") continue;
    const grid = ITEM_SPRITES[id];
    if (found.has(id)) stamp(ctx, grid, s, spot.x, spot.y);
    else outline(spot.x, spot.y, grid[0].length, grid.length);
  }
  if (found.has("weaving-loom")) {
    // the loom: a wooden frame with coloured warp threads, and the striped rug it wove
    fill(s.k, 126, 22, 25, 23);
    fill(s.o, 127, 23, 23, 21);
    for (let x = 129; x < 148; x += 2) fill([s.r, s.b, s.a, s.p][((x - 129) / 2) % 4], x, 25, 1, 15);
    fill(s.d, 128, 33, 21, 2);
    for (let y = 54; y < 63; y++) fill([s.r, s.W, s.b, s.a][(y >> 1) % 4], 112, y, 38, 1);
  } else outline(126, 22, 25, 23);
}
