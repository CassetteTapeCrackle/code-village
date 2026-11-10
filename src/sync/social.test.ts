import { expect, test } from "vitest";
import { testBundle } from "../learning/test-bundle";
import { newsLine } from "./social";

const bundle = testBundle();

test("a skip reads as the world's name, lowercased", () => {
  expect(newsLine({ nickname: "Ada", kind: "world_skipped", id: "w1", day: "2026-10-10" }, bundle)).toBe(
    "Ada tested out of the village",
  );
});

test("a skip of a world the browser no longer knows still reads", () => {
  expect(newsLine({ nickname: "Ada", kind: "world_skipped", id: "gone", day: "2026-10-10" }, bundle)).toBe(
    "Ada tested out of a world",
  );
});
