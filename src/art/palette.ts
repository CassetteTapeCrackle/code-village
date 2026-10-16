import palette from "../styles/palette.json";
import type { Palette } from "../village/clock";

// Every art colour comes from palette.json, the same file the interface colours come from.
// One character per colour in the sprite grids; "1" is clothing, recoloured per villager.
export const SPRITE_COLORS: Record<Palette, Record<string, string>> = {
  day: palette.day.sprite,
  night: palette.night.sprite,
};

export type MapColors = (typeof palette)["day"]["map"];
export const MAP_COLORS: Record<Palette, MapColors> = { day: palette.day.map, night: palette.night.map };

// Washes over the map at dawn and dusk; day and night need none.
export const TINTS: Record<string, string> = palette.tints;

export const VILLAGER_CLOTHES: readonly string[] = palette.villagers;

// Garden flowers take their region's colour.
export const FLOWERS: Record<string, string> = palette.flowers;
