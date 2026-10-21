import { expect, test } from "vitest";
import { FIGURES } from "../art/figures";
import { VILLAGER } from "../art/sprites";
import { activityTop, figureFor } from "./render";

test("a named villager draws as their figure, anyone else as the plain villager", () => {
  expect(figureFor("Ines")).toBe(FIGURES.Ines);
  expect(figureFor("Someone new")).toBe(VILLAGER);
  expect(figureFor(undefined)).toBe(VILLAGER);
});

test("props sit on the hands of the figure being drawn", () => {
  // the activity anchor is the figure's top: tall figures move their props up with them
  expect(activityTop(5, figureFor("Ines"))).toBe(activityTop(5, VILLAGER) - 3);
});
