import { play, type Sound } from "./sound";

const SOUND_KEY = "code-village/sound";

function savedSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === "on";
  } catch {
    return false;
  }
}

// Small celebrations shared across screens: Mochi's cheer in the HUD, and sounds when they are on.
export const moments: { cheer: number; sound: boolean } = $state({ cheer: 0, sound: savedSound() });

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
