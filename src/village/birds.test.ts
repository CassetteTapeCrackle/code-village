import { expect, test } from "vitest";
import { nextFlight } from "./render";

test("a bird takes off when Mochi comes near, and lands again once Mochi has gone", () => {
  expect(nextFlight(0, false, 0.1)).toBe(0); // nobody near: it keeps hopping
  const up = nextFlight(0, true, 0.1);
  expect(up).toBeGreaterThan(0);
  expect(nextFlight(7.95, true, 0.1)).toBeCloseTo(8.05); // Mochi still there: it stays away
  expect(nextFlight(7.95, false, 0.1)).toBe(0); // Mochi gone, time is up: back on the path
  expect(nextFlight(3, false, 0.1)).toBeCloseTo(3.1); // still flying off
});
