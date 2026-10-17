import { play, type Sound } from "./sound";
import type { Decor } from "../village/decor";

const SOUND_KEY = "code-village/sound";

function savedSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

// The level just reached, and what it added, shown once as a toast at the bottom of the map.
export type LevelNews = { level: number; items: Decor[] };

// Small celebrations shared across screens: Mochi's cheer in the HUD, sounds when they are on, and the
// level toast the village raises when the map is back in view.
export const moments: { cheer: number; sound: boolean; level: LevelNews | null } = $state({
  cheer: 0,
  sound: savedSound(),
  level: null,
});

export function setSound(on: boolean): void {
  moments.sound = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // private mode: the switch lasts until the page reloads
  }
}

export function moment(kind: Sound): void {
  if (kind !== "fail") moments.cheer += 1;
  if (moments.sound) play(kind);
}

export function announceLevel(news: LevelNews): void {
  moments.level = news;
}

export function clearLevelToast(): void {
  moments.level = null;
}
