import { expect, test } from "vitest";
import { addDays, daysBetween, today } from "./dates";
import { isDue, isWilting, reviewFailed, reviewPassed, seedPlant } from "./plants";

test("dates are local calendar days", () => {
  expect(today(new Date(2026, 9, 12, 23, 59))).toBe("2026-10-12");
  expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // across the clock change
  expect(daysBetween("2026-10-12", "2026-11-02")).toBe(21);
});

test("a plant climbs seed -> sprout -> flowering -> tree on 1, 3, 7, 21 days", () => {
  let p = seedPlant("2026-10-01");
  expect(p).toEqual({ stage: 0, due: "2026-10-02" });
  p = reviewPassed(p, "2026-10-02");
  expect(p).toEqual({ stage: 1, due: "2026-10-05" });
  p = reviewPassed(p, "2026-10-05");
  expect(p).toEqual({ stage: 2, due: "2026-10-12" });
  p = reviewPassed(p, "2026-10-12");
  expect(p).toEqual({ stage: 3, due: "2026-11-02" });
  expect(reviewPassed(p, "2026-11-02")).toEqual({ stage: 3, due: "2026-11-23" });
});

test("a failed review drops one stage (never below seed) and comes back tomorrow", () => {
  expect(reviewFailed({ stage: 2, due: "2026-10-12" }, "2026-10-12")).toEqual({
    stage: 1,
    due: "2026-10-13",
  });
  expect(reviewFailed({ stage: 0, due: "2026-10-12" }, "2026-10-12")).toEqual({
    stage: 0,
    due: "2026-10-13",
  });
});

test("due on its day; wilting from 2 days late", () => {
  const p = { stage: 1 as const, due: "2026-10-10" };
  expect([isDue(p, "2026-10-09"), isDue(p, "2026-10-10")]).toEqual([false, true]);
  expect([isWilting(p, "2026-10-11"), isWilting(p, "2026-10-12")]).toEqual([false, true]);
});
