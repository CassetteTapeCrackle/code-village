// Light mode: a quieter way to run the map on a machine that cannot keep up. It is chosen from the machine's
// own paint times and stays silent. Two changes: the fog clouds snap to whole map pixels, and the frame loop
// paints once behind a board and then waits for it to close.
export const PAINT_BUDGET_MS = 8; // a slower paint than this, on average, means the machine is struggling
export const SAMPLE_COUNT = 60; // how many recent paints the average is taken over

// True when the recent paints average above the budget, or when light mode is already on: once on it stays on
// for the session, so a slow patch cannot flip it back and forth.
export function shouldGoLight(samples: readonly number[], light = false): boolean {
  if (light) return true;
  if (samples.length < SAMPLE_COUNT) return false;
  const average = samples.reduce((sum, ms) => sum + ms, 0) / samples.length;
  return average > PAINT_BUDGET_MS;
}

// A dev override for testing: ?light=1 forces light mode on, ?light=0 forces it off, anything else leaves the
// choice to the machine.
export function lightOverride(search: string): boolean | null {
  const value = new URLSearchParams(search).get("light");
  return value === "1" ? true : value === "0" ? false : null;
}
