// The world grid's basics, shared by the layout and the areas without either importing the other.
export type Point = { x: number; y: number };
export const TILE = 8;
// The village sits at this tile offset: the Forest lies west of it, the Mountains north.
export const VX = 40;
export const VY = 28;
export const village = (x: number, y: number): Point => ({ x: VX + x, y: VY + y });
