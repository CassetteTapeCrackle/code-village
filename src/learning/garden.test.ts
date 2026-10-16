import { expect, test } from "vitest";
import { bedStatus, gardenBeds } from "./garden";
import { testBundle } from "./test-bundle";
import { emptyProgress, type Progress } from "./types";

const D = "2026-10-13";

test("one bed per concept, with its region, stage and whether it is due", () => {
  const p: Progress = {
    ...emptyProgress(),
    plants: {
      vars: { stage: 2, due: D },
      lists: { stage: 0, due: "2026-10-01" },
      gone: { stage: 3, due: D },
    },
  };
  const beds = gardenBeds(testBundle(), p, D);
  expect(beds.map((b) => [b.concept, b.region, b.stage, b.due])).toEqual([
    ["vars", "a", "flowering", true],
    ["loops", "a", null, false],
    ["lists", "b", "wilting", true],
  ]);
});

test("a bed explains itself", () => {
  const [vars, loops, lists] = gardenBeds(
    testBundle(),
    {
      ...emptyProgress(),
      plants: { vars: { stage: 1, due: "2026-10-20" }, lists: { stage: 0, due: "2026-10-01" } },
    },
    D,
  );
  expect(bedStatus(vars)).toBe("A sprout. Next watering on 2026-10-20.");
  expect(bedStatus(loops)).toMatch(/Not planted yet/);
  expect(bedStatus(lists)).toMatch(/wilting/);
});
