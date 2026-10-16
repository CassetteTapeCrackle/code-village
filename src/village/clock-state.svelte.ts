import { paletteFor, timeNow, type Palette, type TimeOfDay } from "./clock";
import type { Season } from "./weather";

const FORCED_KEY = "code-village/forced-time";
const TIMES: readonly string[] = ["dawn", "day", "dusk", "night"];

function savedForced(): TimeOfDay | null {
  try {
    const saved = sessionStorage.getItem(FORCED_KEY);
    return saved && TIMES.includes(saved) ? (saved as TimeOfDay) : null;
  } catch {
    return null;
  }
}

export const clock: { time: TimeOfDay; palette: Palette; forced: TimeOfDay | null } = $state({
  time: "day",
  palette: "day",
  forced: savedForced(), // set by the dev cheat screen to preview a time of day, kept for the browser session
});

// Reads the local clock and puts the result on <html> so tokens.css can switch palettes.
export function tickClock(time: TimeOfDay = clock.forced ?? timeNow()): void {
  clock.time = time;
  clock.palette = paletteFor(time);
  document.documentElement.dataset.time = time;
  document.documentElement.dataset.palette = clock.palette;
}

export function forceTime(time: TimeOfDay | null): void {
  clock.forced = time;
  try {
    if (time) sessionStorage.setItem(FORCED_KEY, time);
    else sessionStorage.removeItem(FORCED_KEY);
  } catch {
    // private mode: the override just lasts until the page reloads
  }
  tickClock();
}

// The dev cheat screen can preview a season for the browser session; otherwise the map follows the real date.
const SEASON_KEY = "code-village/forced-season";
const SEASONS: readonly string[] = ["spring", "summer", "autumn", "winter"];
function savedSeason(): Season | null {
  try {
    const saved = sessionStorage.getItem(SEASON_KEY);
    return saved && SEASONS.includes(saved) ? (saved as Season) : null;
  } catch {
    return null;
  }
}
export const forcedSeason: { season: Season | null } = $state({ season: savedSeason() });
export function forceSeason(season: Season | null): void {
  forcedSeason.season = season;
  try {
    if (season) sessionStorage.setItem(SEASON_KEY, season);
    else sessionStorage.removeItem(SEASON_KEY);
  } catch {
    // private mode: the preview lasts until the page reloads
  }
}
