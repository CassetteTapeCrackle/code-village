// Paint cadence: the map is stepped pixel art, so ambient motion needs about 30 paints a second. Those paints
// are taken on the display's own beats (every Nth animation frame), never on a timer, so the gaps stay even
// on 60 Hz and 120 Hz screens alike. Anything the player drives paints on every frame instead.
export const AMBIENT_FPS = 30;

// How many display frames make one ambient paint: 2 at 60 Hz, 4 at 120 Hz, 1 at 30 Hz.
export function ambientEvery(frameMs: number, fps = AMBIENT_FPS): number {
  if (!(frameMs > 0)) return 1;
  return Math.max(1, Math.round(1000 / fps / frameMs));
}

// A running estimate of the display frame length. Pauses (a hidden tab, a long task) are ignored, so the
// count does not jump to a stall's length.
export function nextFrameMs(current: number, delta: number): number {
  if (!(delta > 0) || delta > 100) return current;
  return current > 0 ? current * 0.9 + delta * 0.1 : delta;
}
