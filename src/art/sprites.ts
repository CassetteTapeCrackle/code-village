import type { Grid } from "./draw";
import { FIGURES } from "./figures";

// One character per pixel, "." is transparent; colours come from SPRITE_COLORS.
// Mochi is the old Study room mascot, unchanged.
export const MOCHI: Grid = [
  "....g.g.....",
  ".....G......",
  "...kkkkkkk..",
  "..kWgggggk..",
  ".kgggggggggk",
  ".kggGgggGggk",
  ".kgpgeeegpgk",
  ".kGgggggggGk",
  "..kGGGGGGGk.",
  "...kkkkkkk..",
];

// A teacher whose portrait is not drawn yet: a traveller in a grey hood and a plain cloak.
export const TRAVELLER: Grid = [
  "..kkkk..",
  ".kSSSSk.",
  "kSSuuSSk",
  "kSueueSk",
  ".kuuuuk.",
  "..khhk..",
  ".khhhhk.",
  "khhhhhhk",
  "kuhhhhuk",
  ".khhhhk.",
  ".khhhhk.",
  ".kk..kk.",
];

export const VILLAGER: Grid = [
  "..kkkk..",
  ".kHHHHk.",
  "kHHuuHHk",
  "kHueueHk",
  ".kuuuuk.",
  "..k11k..",
  ".k1111k.",
  "k111111k",
  "ku1111uk",
  ".k1111k.",
  ".kk..kk.",
];

// Teacher portraits by the id a world.toml names; an unknown id shows the TRAVELLER.
export const PORTRAITS: Record<string, Grid> = {
  teacher: FIGURES.Juniper,
  ranger: FIGURES.Noa,
  stargazer: FIGURES.Alex,
  bram: FIGURES.Bram,
};

export const CAT: Grid = ["k.k......", "kckkkkk..", "kcecccck.", "kccccccck", ".kcCcCcck", "..kk.kk.."];

export const TREE: Grid = [
  "....kkk....",
  "..kkLLLkk..",
  ".kLLLLlLLk.",
  "kLLlLLLLLLk",
  "kLLLLLLlLLk",
  "kLlLLLLLLLk",
  ".kLLLlLLLk.",
  "..kkLLLkk..",
  "....kok....",
  "....kok....",
  "...kkokk...",
];

export const BUSH: Grid = [".kkkkk.", "kLlLLLk", "kLLLlLk", "kLLLLLk", ".kkkkk."];

export const ROCK: Grid = [".kkkk..", "ksssSk.", "kssssSk", "kSsSSSk", ".kkkkk."];

export const STONE_BLOCK: Grid = ["kkkkkkk", "ksssssk", "ksSsssk", "ksssSsk", "kkkkkkk"];

export const REEDS: Grid = ["x.x..", "x.x.x", "xxx.x", ".x.xx", ".xxx.", "..x..", "..x.."];

export const LANTERN: Grid = [
  ".kkk.",
  "kyyyk",
  "kyWyk",
  "kyyyk",
  ".kkk.",
  "..o..",
  "..o..",
  "..o..",
  "..o..",
  ".kok.",
  "kkkkk",
];

export const FOUNTAIN: Grid = [
  "........ii........",
  ".......i..i.......",
  "......i.ii.i......",
  "........kk........",
  "....kkkkSSkkkk....",
  ".kssssssssssssssk.",
  "ksIIIIiIIIIiIIIIsk",
  "ksIIiIIIIIIIIiIIsk",
  "kSsIIIIIIIIIIIIsSk",
  ".kSSSSSSSSSSSSSSk.",
  "..kkkkkkkkkkkkkk..",
];

export const FLOWER_BED: Grid = [
  ".p.a..p.l.a.p..a",
  "pap.lpa.palp.lpa",
  "LlLlLlLlLlLlLlLl",
  "oooooooooooooooo",
];

// A wax seal for passed lessons.
export const SEAL: Grid = [".kkkk.", "krrrrk", "krWrrk", "krrrRk", "krRRRk", ".kkkk."];

export const DUCK: Grid = ["..kk..", ".kWWka", "kWWWWk", ".kkkk."];

// Village life: chickens (standing and pecking), a barrel and a scarecrow.
export const CHICKEN: Grid = ["..kr.", ".kWWa", "kWWWk", ".kWk.", "..a.."];
export const CHICKEN_PECK: Grid = [".....", "..kr.", "kWWkW", "kWWWa", ".a.a."];
export const BARREL: Grid = [".kkkk.", "kddddk", "kkkkkk", "kddodk", "kkkkkk", "kddddk", ".kkkk."];
export const SCARECROW: Grid = [
  "...kk...",
  "..khhk..",
  "..khhk..",
  "kkkookkk",
  "kaaooaak",
  "...oo...",
  "...oo...",
  "...kk...",
];

export const ZZZ: Grid = ["kkk....", "..k....", ".k..kkk", "kkk...k", ".....k.", "....kkk"];

// Plant stages for the garden (7 wide, 5 tall, drawn on soil) and a pot for interiors.
export const PLANT_TOPS: Record<"seed" | "sprout" | "flowering" | "tree" | "wilting", Grid> = {
  seed: [".......", ".......", ".......", ".......", "...o..."],
  sprout: [".......", ".......", "..l.l..", "...L...", "...L..."],
  flowering: ["..p.p..", ".pap...", "..pL.l.", "...Ll..", "...L..."],
  tree: ["..LLL..", ".LLlLL.", "LLLLlLL", ".LLLLL.", "...o..."],
  wilting: [".......", ".......", ".hh....", "..hL...", "...L..."],
};

// Bigger growth stages for the garden scene (11 x 12); "f" is the flower colour, set per region.
export const BIG_PLANTS: Record<"seed" | "sprout" | "flowering" | "tree" | "wilting", Grid> = {
  seed: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "....l......",
    ".....l.....",
    "....ooo....",
    "...ooooo...",
  ],
  sprout: [
    "...........",
    "...........",
    "...........",
    "...........",
    "..ll...ll..",
    ".lLLl.lLLl.",
    "..lLLlLLl..",
    "....lLl....",
    ".....L.....",
    ".....L.....",
    ".....L.....",
    "....ooo....",
  ],
  flowering: [
    "....f......",
    "...faf..f..",
    "....f..faf.",
    "..lLl...f..",
    ".lLLLl.lLl.",
    "lLLfLLlLLLl",
    "lLfafLLLLLl",
    ".lLfLLLfLl.",
    "..lLLLfafl.",
    "...lLLLfL..",
    ".....L.....",
    "....ooo....",
  ],
  tree: [
    "...kkkkk...",
    ".kkLLLLLkk.",
    "kLLlLLrLLLk",
    "kLrLLLLLlLk",
    "kLLLLlLLLrk",
    "kLlLrLLLLLk",
    ".kLLLLLrLk.",
    "..kkLLLkk..",
    ".....o.....",
    ".....o.....",
    ".....o.....",
    "....ooo....",
  ],
  wilting: [
    "...........",
    "...........",
    "...........",
    "...........",
    "...........",
    "..hhh......",
    ".h...h..hh.",
    ".....h.h..h",
    ".....hh....",
    ".....L.....",
    ".....L.....",
    "....ooo....",
  ],
};

export const SHED: Grid = [
  "....kkkkkkkkkkkkkkkk....",
  "...kRRRRRRRRRRRRRRRRk...",
  "..krrrrrrrrrrrrrrrrrrk..",
  ".krrrrrrrrrrrrrrrrrrrrk.",
  "kRRRRRRRRRRRRRRRRRRRRRRk",
  ".kwdwdwdwdwdwdwdwdwdwdk.",
  ".kwdwdwkkkkkkwdwdwdwdwk.",
  ".kwdwdwkooookwdwkkkkwdk.",
  ".kwdwdwkooookwdwkyykwdk.",
  ".kwdwdwkooaokwdwkkkkwdk.",
  ".kwdwdwkooookwdwdwdwdwk.",
  ".kkkkkkkkkkkkkkkkkkkkkk.",
];

export const WELL: Grid = [
  ".kkkkkkkkkkkk.",
  "kRRRRRRRRRRRRk",
  ".k.o......o.k.",
  "...o..kk..o...",
  "...o..kok.o...",
  "..kkkkkkkkkk..",
  ".ksSssSssSssk.",
  ".kSssSssSssSk.",
  ".ksIIIIIIIIsk.",
  ".kSssSssSssSk.",
  "..kkkkkkkkkk..",
];

export const BENCH: Grid = [
  "kkkkkkkkkkkkkkkkkk",
  "kddddddddddddddddk",
  "kkkkkkkkkkkkkkkkkk",
  ".kk............kk.",
  ".kk............kk.",
];

export const WATERING_CAN: Grid = ["....kk.", "kkkkbk.", "kbbbbbk", "kbbbbk.", "kbbbbk.", ".kkkk.."];

export const POT: Grid = ["kkkkkkk", "ktttttk", ".kTTTk.", ".kkkkk."];

export const ICONS: Record<
  "book" | "slate" | "heart" | "sprout" | "coin" | "key" | "rope" | "cup" | "star",
  Grid
> = {
  coin: [".aaa.", "aayaa", "ayaaa", "aaaaa", ".aaa."],
  key: [".aa..", "a..a.", ".aa..", "..a..", "..aa."],
  rope: ["..oo.", ".o..o", "o..o.", ".oo..", "..o.."],
  cup: ["kkkkk", "kWrWk", "kWWWk", ".kWk.", "kkkkk"],
  star: ["..a..", ".aaa.", "aayaa", ".aaa.", ".a.a."],
  book: ["kkkkk", "kbbbk", "kbwbk", "kbbbk", "kkkkk"],
  slate: ["kkkkk", "knnnk", "knwnk", "knnnk", "kkkkk"],
  heart: [".k.k.", "kpkpk", "kpppk", ".kpk.", "..k.."],
  sprout: ["l...l", ".l.l.", "..L..", "..L..", "ooooo"],
};

export type BuildingOptions = {
  w: number;
  h: number;
  roof: "r" | "z" | "j" | "d";
  wall?: string;
  icon?: Grid;
};

const ROOF_SHADE: Record<BuildingOptions["roof"], string> = { r: "R", z: "Z", j: "J", d: "o" };

// A cottage seen slightly from the front: a shingled roof with a chimney, a timber-framed wall on a stone
// footing, shuttered windows with flower boxes, and a plank door. Small sizes drop the details that do not fit.
export function building({ w, h, roof, wall = "w", icon }: BuildingOptions): Grid {
  const shade = ROOF_SHADE[roof];
  const roofH = Math.floor(h * 0.55);
  const rows: string[][] = Array.from({ length: h }, () => Array<string>(w).fill("."));
  const set = (x: number, y: number, ch: string): void => {
    if (y >= 0 && y < h && x >= 0 && x < w) rows[y][x] = ch;
  };
  const box = (
    x0: number,
    y0: number,
    bw: number,
    bh: number,
    fill: (x: number, y: number) => string,
  ): void => {
    for (let y = y0; y < y0 + bh; y++)
      for (let x = x0; x < x0 + bw; x++)
        set(
          x,
          y,
          x === x0 || x === x0 + bw - 1 || y === y0 || y === y0 + bh - 1 ? "k" : fill(x - x0, y - y0),
        );
  };
  // roof: courses of shingles, staggered, darker along the eave
  for (let y = 0; y < roofH; y++) {
    const inset = Math.max(0, 2 - y);
    const course = Math.floor(y / 3);
    for (let x = inset; x < w - inset; x++) {
      const edge = x === inset || x === w - 1 - inset || y === 0 || y === roofH - 1;
      const seam = y % 3 === 2 || (x + course * 2) % 5 === 0;
      set(x, y, edge ? "k" : y >= roofH - 3 || seam ? shade : roof);
    }
  }
  // chimney on the right of the roof, where the smoke rises
  if (w >= 24 && roofH >= 10) {
    box(w - 13, 1, 5, 8, (_, y) => (y === 1 ? "S" : y % 2 ? "R" : "T"));
  }
  // wall: cream plaster with corner posts and a beam under the eave
  const wallTop = roofH;
  for (let y = wallTop; y < h; y++) {
    for (let x = 1; x < w - 1; x++)
      set(x, y, x === 1 || x === w - 2 || y === h - 1 ? "k" : wall === "h" && y % 3 === 0 ? "o" : wall);
  }
  if (w >= 20) {
    for (let y = wallTop; y < h - 1; y++) [3, w - 4].forEach((x) => set(x, y, "h"));
    for (let x = 2; x < w - 2; x++) set(x, wallTop, "h");
  }
  // stone footing along the bottom
  if (h - wallTop >= 10) {
    for (let y = h - 4; y < h - 1; y++)
      for (let x = 2; x < w - 2; x++) set(x, y, (x + (y % 2) * 2) % 4 === 0 ? "S" : "s");
  }
  // door with planks, a knob and a step
  const doorH = Math.min(h - roofH - 1, 10);
  const doorW = w >= 20 ? 6 : 4;
  const doorX = Math.floor(w / 2) - doorW / 2;
  box(doorX, h - 1 - doorH, doorW, doorH + 1, (x) => (x % 2 === 0 ? "o" : "d"));
  set(doorX + doorW - 2, h - 1 - Math.ceil(doorH / 2), "a");
  // windows: glass with a cross, shutters in the roof colour, and a flower box
  if (w >= 20 && h - roofH >= 9) {
    const ww = w >= 40 ? 8 : 6;
    const wy = wallTop + 3;
    const wh = Math.min(7, h - wallTop - 6);
    for (const wx of [5, w - 5 - ww]) {
      box(wx, wy, ww, wh, (x, y) =>
        x === ww / 2 || y === Math.floor(wh / 2) ? "k" : x === 1 && y === 1 ? "W" : "i",
      );
      for (let y = wy; y < wy + wh; y++) {
        set(wx - 1, y, roof);
        set(wx + ww, y, roof);
      }
      for (let x = wx - 1; x <= wx + ww; x++) set(x, wy + wh, "o");
      for (let x = wx; x < wx + ww; x += 2) set(x, wy + wh - 1, x % 4 === 1 ? "p" : x % 4 === 3 ? "r" : "l");
    }
  }
  if (icon) {
    const ix = Math.floor((w - icon[0].length) / 2);
    const iy = Math.max(1, roofH - icon.length - 1);
    icon.forEach((line, dy) => [...line].forEach((ch, dx) => ch !== "." && set(ix + dx, iy + dy, ch)));
  }
  return rows.map((r) => r.join(""));
}

// Forest and mountain scenery.
export const PINE: Grid = [
  "....k....",
  "...kLk...",
  "..kLlLk..",
  "..kkLkk..",
  ".kLLlLLk.",
  ".kkLLLkk.",
  "kLLLlLLLk",
  "kkkkkkkkk",
  "....o....",
  "...kok...",
];
export const FERN: Grid = ["l.l.l", ".lLl.", "..L.."];
export const MUSHROOM: Grid = [".kkk.", "krWrk", ".kuk.", ".kuk."];

// Everyday props, there from the first day.
export const HANDCART: Grid = [
  "..rr.aa.ll.rr...",
  "kkkkkkkkkkkk....",
  "khhhhhhhhhhk....",
  "khdhhdhhdhhkkkkk",
  "khhhhhhhhhhk....",
  "kkkkkkkkkkkk....",
  "..kkk...........",
  ".kSkSk..........",
  "..kkk...........",
];
export const ROWBOAT: Grid = [
  "..k........k..",
  "...k......k...",
  "kkkkkkkkkkkkkk",
  "khhhhhhhhhhhhk",
  ".kddddddddddk.",
  "..kkkkkkkkkk..",
];
export const STUMP: Grid = [".kkkkk.", "khhohhk", "kohhhok", "koooook", ".kkkkk."];
export const BIRDHOUSE: Grid = [
  "...k...",
  "..krk..",
  ".krrrk.",
  "krrrrrk",
  ".khhhk.",
  ".khkhk.",
  ".khhhk.",
  "..kok..",
  "...o...",
  "...o...",
  "...o...",
];
export const BIRD: Grid = ["..kk.", ".kbbk", "kbbbk", ".kkk.", "..k.."];
export const BIRD_FLAP: Grid = ["k...k", ".kbk.", "..k.."];
export const FROG: Grid = [".k.k.", "kLlLk", "kLLLk", ".k.k."];

// A stone tower with a dome and a slit for the telescope.
export function observatory(w: number, h: number): Grid {
  const rows: string[][] = Array.from({ length: h }, () => Array<string>(w).fill("."));
  const set = (x: number, y: number, ch: string): void => {
    if (y >= 0 && y < h && x >= 0 && x < w) rows[y][x] = ch;
  };
  const domeH = Math.floor(h * 0.45);
  const r = Math.min(Math.floor(w / 2) - 3, domeH - 1); // the dome fits under the top edge, never clipped
  const cx = Math.floor(w / 2);
  for (let y = 0; y < domeH; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx + 0.5, domeH - y);
      if (d <= r)
        set(
          x,
          y,
          d > r - 1.2
            ? "k"
            : x === cx || x === cx - 1
              ? y < domeH - 2
                ? "k"
                : "z"
              : (x + y) % 6 === 0
                ? "Z"
                : "z",
        );
    }
  }
  for (let x = 2; x < w - 2; x++) set(x, domeH, "k");
  for (let y = domeH + 1; y < h; y++) {
    for (let x = 3; x < w - 3; x++)
      set(
        x,
        y,
        x === 3 || x === w - 4 || y === h - 1
          ? "k"
          : (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0 || y % 3 === 0
            ? "S"
            : "s",
      );
  }
  for (let y = h - 9; y < h - 1; y++)
    for (let x = cx - 3; x < cx + 3; x++) set(x, y, x === cx - 3 || x === cx + 2 || y === h - 9 ? "k" : "o");
  for (const wx of [6, w - 11])
    for (let y = domeH + 4; y < domeH + 9; y++)
      for (let x = wx; x < wx + 5; x++)
        set(x, y, x === wx || x === wx + 4 || y === domeH + 4 || y === domeH + 8 ? "k" : "i");
  return rows.map((row) => row.join(""));
}

// An ancient oak, drawn at its own size (17 x 17): n is the shaded side of the canopy.
export const OLD_OAK: Grid = [
  "......kkkkk......",
  "....kkLLlLLkk....",
  "..kkLLLLLLLLLkk..",
  ".kLLlLLLLLlLLLLk.",
  ".kLLLLLLLLLLLlNk.",
  "kLLLLlLLLLLLLLLNk",
  "kLlLLLLLLlLLLLNNk",
  "kLLLLLLLLLLLLLNNk",
  ".kLLLLLlLLLLLNNk.",
  ".kNLLLLLLLLLLNNk.",
  "..kkNNLLLLLNNkk..",
  "....kkkokkokk....",
  "......kook.......",
  "......koonk......",
  ".....koooonk.....",
  "....kookkoonk....",
  "...kkk....kkk....",
];
