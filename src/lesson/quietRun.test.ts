import { expect, test } from "vitest";
import { quietRunNote } from "./quietRun";

test("a quiet run that only defines a function says so and how to try it", () => {
  const note = quietRunNote("def add_strings(a, b):\n    return int(a) + int(b)\n");
  expect(note).toContain("only defines add_strings");
  expect(note).toContain("print(add_strings(...))");
  expect(note).toContain("Check");
});

test("classes count as definitions too", () => {
  expect(quietRunNote("class Tent:\n    pass\n")).toContain("only defines Tent");
});

test("a quiet program with no definitions just says it printed nothing", () => {
  expect(quietRunNote("x = 3\n")).toBe("Your code ran without errors and printed nothing.");
});
