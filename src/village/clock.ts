import type { Day } from "../learning/types";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";
export type Palette = "day" | "night";

export function timeOfDay(d: Date): TimeOfDay {
  const h = d.getHours();
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 18) return "day";
  if (h >= 18 && h < 20) return "dusk";
  return "night";
}

export function paletteFor(t: TimeOfDay): Palette {
  return t === "night" ? "night" : "day";
}

// A small string hash so the same date always gets the same weather.
function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function isRainyDay(day: Day): boolean {
  return hash(day) % 5 === 0;
}

export function timeNow(): TimeOfDay {
  return timeOfDay(new Date());
}
