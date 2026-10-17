// Dev readout for the frame loop: ?perf=1 shows paints per second, the last paint's time, the display rate
// and whether light mode is on. Without it nothing is shown and nothing is recorded.
export function perfEnabled(search: string): boolean {
  return new URLSearchParams(search).get("perf") === "1";
}

// Paints per second, measured over the span of the paints in the second before `now` (oldest first). Counting
// the span rather than the samples makes a steady 30 a second read as 30, not 31.
export function paintRate(times: readonly number[], now: number): number {
  let first = -1;
  let last = -1;
  let n = 0;
  for (let i = times.length - 1; i >= 0 && times[i] > now - 1000; i--) {
    if (last < 0) last = times[i];
    first = times[i];
    n++;
  }
  return n > 1 ? Math.round(((n - 1) * 1000) / (last - first)) : 0;
}
