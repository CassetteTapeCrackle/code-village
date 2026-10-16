import { expect, test } from "vitest";
import { parseRoute } from "./route";

test("hashes map to places; anything else is home", () => {
  expect(parseRoute("#/lesson/lists")).toEqual({ name: "lesson", id: "lists" });
  expect(parseRoute("#/boss/gradebook")).toEqual({ name: "boss", id: "gradebook" });
  expect(parseRoute("#/school")).toEqual({ name: "school" });
  expect(parseRoute("#/cheat")).toEqual({ name: "cheat" });
  expect(parseRoute("#/garden")).toEqual({ name: "garden" });
  expect(parseRoute("#/library")).toEqual({ name: "library" });
  expect(parseRoute("#/house")).toEqual({ name: "house" });
  expect(parseRoute("#/sandbox")).toEqual({ name: "sandbox" });
  expect(parseRoute("#/board")).toEqual({ name: "board" });
  expect(parseRoute("#/school/w2")).toEqual({ name: "school", world: "w2" });
  expect([parseRoute(""), parseRoute("#/"), parseRoute("#/lesson/"), parseRoute("#/attic")]).toEqual(
    Array(4).fill({ name: "home" }),
  );
});
