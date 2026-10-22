import { expect, test } from "vitest";
import { PLACES } from "../layout";
import { SHORE_LAIRS } from "./shoreLairs";

test("every shore lair has its own art", () => {
  const lairs = PLACES.filter((p) => p.world === "w4" && p.kind === "lair").map((p) => p.lair);
  expect(lairs.sort()).toEqual(Object.keys(SHORE_LAIRS).sort());
});
