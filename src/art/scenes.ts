import type { Grid } from "./draw";

// Sprites for the scenes items bring to the map (world-pass mockup section 4), drawn at their own size.
export const DOG: Grid = [".....kk.", "k...kCCk", "kkkkCCkk", "kCCCCCk.", ".kCkkCk.", ".kk..kk."];
export const KENNEL: Grid = [
  "....k....",
  "...kRk...",
  "..kRRRk..",
  ".kRRRRRk.",
  "kkkkkkkkk",
  ".khhkhhk.",
  ".khkekhk.",
  ".khkekhk.",
  ".kkkkkkk.",
];
export const OVEN: Grid = [
  "...kkkkkk...",
  "..kccccCCk..",
  ".kccccccCCk.",
  "kccckkkkcCCk",
  "kcckeeeekcCk",
  "kcckeayekcCk",
  "kkkkkkkkkkkk",
  ".kSSSSSSSSk.",
  ".kkkkkkkkkk.",
];
export const RACK: Grid = ["kkkkkk", "kCcCck", "kkkkkk", "k....k", "kCCcck", "kkkkkk", "k....k"];
export const BUG_HOTEL: Grid = [
  "...kk...",
  "..kRRk..",
  ".kRRRRk.",
  "kkkkkkkk",
  "khoHohok",
  "kkkkkkkk",
  "kHohoHok",
  "kkkkkkkk",
  "khHohHok",
  "kkkkkkkk",
  ".k....k.",
  ".k....k.",
];
export const STAND: Grid = [
  "kkkkkkkkkk",
  "khhhhhhhhk",
  "khWWhWWWhk",
  "khWkhWkWhk",
  "khWWhWWWhk",
  "kkkkkkkkkk",
  ".k......k.",
  ".k......k.",
  ".k..kk..k.",
  ".k.kWWk.k.",
  ".k.kkkk.k.",
  ".k..kk..k.",
];
export const SIGN: Grid = ["kkkkk", "khhhk", "kkkkk", "..o..", "..o.."];
export const BIRDHOUSE_POLE: Grid = ["..k..", ".kRk.", "kRRRk", "khkhk", "khhhk", "kkkkk"];
export const SAPLING: Grid = [
  "..kkkk..",
  ".kLLlLk.",
  "kLlLLLnk",
  "kLLLLnnk",
  ".knLLnk.",
  "..kkkk..",
  "...ko...",
  "...ok...",
  "..kook..",
];
export const WORKBENCH: Grid = [
  "S.........a.",
  "SS.......kak",
  "kkkkkkkkkkkk",
  "khhhhhhhhhhk",
  "kkkkkkkkkkkk",
  ".ko......ok.",
  ".ko......ok.",
];
export const TOWER: Grid = [
  "....kkkk....",
  "..kkRRRRkk..",
  "kkRRRRRRRRkk",
  "kkkkkkkkkkkk",
  ".k.khhhhk.k.",
  ".k.khkkhk.k.",
  "kkkkkkkkkkkk",
  ".khhhhhhhhk.",
  ".kkkkkkkkkk.",
  "..o.k..k.o..",
  "..ok....ko..",
  "..o.k..k.o..",
  "..o..kk..o..",
  "..o.k..k.o..",
  "..ok....ko..",
  "..o.k..k.o..",
  "..o..kk..o..",
  "..o.k..k.o..",
  ".kok....kok.",
];
export const SUNDIAL: Grid = [
  "...kkkkk...",
  ".kkssssskk.",
  "ksssskssssk",
  "ksssakasssk",
  ".kkSSSSSkk.",
  "...kkkkk...",
  "....ksk....",
  "....ksk....",
  "...kssSk...",
  "..kkkkkkk..",
];
export const WHEEL: Grid = [
  "..kkkkk..",
  ".kh.h.hk.",
  "kh.khk.hk",
  "k.khhhk.k",
  "khhhohhhk",
  "k.khhhk.k",
  "kh.khk.hk",
  ".kh.h.hk.",
  "..kkkkk..",
];
export const VANE: Grid = ["...a...", "..aaa..", "kkkakkk", "...k...", "...k..."];
export const SCREEN: Grid = [
  ".kkkkk.",
  "kWWWWWk",
  "kWsssWk",
  "kWWWWWk",
  "kWsssWk",
  "kWWWWWk",
  "kkkkkkk",
  "..k.k..",
  "..k.k..",
  "..k.k..",
  ".kk.kk.",
];
export const GAUGE: Grid = ["kkk", "kbk", "kWk", "kWk", "kkk"];
export const SLUICE: Grid = [
  "kk........",
  "kbkk......",
  "khbbkk....",
  ".kkhbbkk..",
  "...kkhbbkk",
  ".....kkhhk",
  "......k.kk",
];
export const SIEVE: Grid = [".kkk.", "kSkSk", "kkSkk", ".kkk."];
export const STAR_STONE: Grid = [".ss.", "sWWs", ".ss."];
export const PENNANT: Grid = [
  "kRR..",
  "kRRRR",
  "kRR..",
  "k....",
  "k....",
  "k....",
  "k....",
  "k....",
  "k....",
  "k....",
  "k....",
  "kk...",
];
export const LADDER: Grid = ["k.k", "kkk", "k.k", "kkk", "k.k", "kkk", "k.k", "kkk", "k.k"];
export const BASKET: Grid = [".r.r.", "krrrk", "khhhk", ".kkk."];

// Level rewards (world-pass mockup section 6).
export const DEER: Grid = [
  "k.k......",
  "kCk......",
  ".kCkkkkk.",
  ".kCCCCCCk",
  "..kCCCCk.",
  "..k.k.kk.",
  "..k.k.k..",
];
export const FAWN: Grid = ["k.....", "kCkkk.", ".kCCCk", ".k.k.k"];
export const RABBIT: Grid = [".k.k", ".kWk", "kWWk", "kkkk"];
export const HAY: Grid = ["..kkk..", ".kaaak.", "kayaaak", "kaaaaak", "kkkkkkk"];
export const CHAIR: Grid = ["k....", "k....", "kkkk.", "kh.k.", "k..k.", ".kkkk"];
export const GOAT: Grid = ["kk....", "kWk...", ".kWWWk", ".kWWWk", ".k.k.k"];
export const DRYRACK: Grid = ["kkkkkkk", "k.r.r.k", "k.W.W.k", "k.....k"];
export const BALLOON: Grid = [
  "...kkkkkk...",
  "..kRRWWRRk..",
  ".kRRRWWRRRk.",
  "kRRRRWWRRRRk",
  "kRRRRWWRRRRk",
  "kRRRRWWRRRRk",
  ".kRRRWWRRRk.",
  "..kRRWWRRk..",
  "...kRWWRk...",
  "....kkkk....",
  "....k..k....",
  "....k..k....",
  "....kkkk....",
  "....khhk....",
  "....kkkk....",
];
