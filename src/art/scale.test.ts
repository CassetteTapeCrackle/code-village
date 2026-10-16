import { expect, test } from "vitest";
import { integerScale } from "./scale";

test("art scales by whole numbers only, at least 1 and at most the cap", () => {
  expect([
    integerScale(788, 160),
    integerScale(959, 160),
    integerScale(960, 160),
    integerScale(90, 160),
    integerScale(5000, 160),
  ]).toEqual([4, 5, 6, 1, 8]);
});

test("scaleFor keeps a floor so small screens scroll a readable picture", async () => {
  const { scaleFor } = await import("./scale");
  expect([scaleFor(390, 340, 2, 4), scaleFor(1100, 340, 2, 4), scaleFor(5000, 340, 2, 4)]).toEqual([2, 3, 4]);
});
