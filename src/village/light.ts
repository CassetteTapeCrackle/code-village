// Light mode: a quieter way to run the map on a machine that cannot keep up. It is chosen from the machine's
// own paint times and stays silent. Two changes: the fog clouds snap to whole map pixels, and the frame loop
// paints once behind a board and then waits for it to close.
export const PAINT_BUDGET_MS = 8; // a slower paint than this, on average, means the machine is struggling
export const SAMPLE_COUNT = 60; // how many paints one judgement window holds
export const WINDOW_COUNT = 3; // windows in a row over budget before the map goes light
export const SAMPLE_WARMUP_MS = 3000; // paints this soon after load or a static redraw are not judged

// True when each of the last few full windows of paints averages above the budget. One slow patch (the first
// paints after load, a scene redraw) cannot tip it: the machine has to be slow for a sustained stretch. Once
// light, a fast patch does not switch it back.
export function shouldGoLight(samples: readonly number[], light = false): boolean {
  if (light) return true;
  if (samples.length < SAMPLE_COUNT * WINDOW_COUNT) return false;
  const recent = samples.slice(-SAMPLE_COUNT * WINDOW_COUNT);
  for (let i = 0; i < WINDOW_COUNT; i++) {
    const window = recent.slice(i * SAMPLE_COUNT, (i + 1) * SAMPLE_COUNT);
    const average = window.reduce((sum, ms) => sum + ms, 0) / SAMPLE_COUNT;
    if (average <= PAINT_BUDGET_MS) return false;
  }
  return true;
}

// A dev override for testing: ?light=1 forces light mode on, ?light=0 forces it off, anything else leaves the
// choice to the machine.
export function lightOverride(search: string): boolean | null {
  const value = new URLSearchParams(search).get("light");
  return value === "1" ? true : value === "0" ? false : null;
}
