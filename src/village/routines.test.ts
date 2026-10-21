import { describe, expect, it } from "vitest";
import { buildMap, PLAZA, village, walkable } from "./layout";
import { findPath } from "./paths";
import { ROUTINES, describeJob, jobsFor, routineFor } from "./routines";

describe("villager routines", () => {
  const map = buildMap(["w1", "w2", "w3"]); // every road open: Noa works in the forest
  const jobs = Object.entries(ROUTINES).flatMap(([name, list]) => list.map((job) => ({ name, job })));

  it.each(jobs)("$name can walk to $job.activity at $job.spot.x,$job.spot.y", ({ job }) => {
    expect(walkable(map, job.spot.x, job.spot.y)).toBe(true);
    expect(findPath(map, PLAZA.center, job.spot)).not.toBeNull();
  });

  it("gives every villager more than one thing to do", () => {
    for (const list of Object.values(ROUTINES))
      expect(new Set(list.map((j) => j.activity)).size).toBeGreaterThan(1);
  });

  it("visits a beaten lair only once it is cleared", () => {
    expect(jobsFor("Sam", []).some((j) => j.when === "marsh")).toBe(false);
    expect(jobsFor("Sam", ["marsh"]).some((j) => j.when === "marsh")).toBe(true);
  });

  it("says in words what a villager is doing", () => {
    const sweep = ROUTINES.Ines[0];
    expect(describeJob(sweep, true)).toBe("sweeping at the schoolhouse step");
    expect(describeJob(sweep, false)).toBe("walking to the schoolhouse step");
  });

  it("falls back to a routine for an unknown name", () => {
    expect(routineFor("Nobody").length).toBeGreaterThan(0);
  });

  it("keeps Juniper at the school door", () => {
    const door = village(28, 12);
    expect(ROUTINES.Juniper.length).toBeGreaterThan(1);
    for (const job of ROUTINES.Juniper) expect(job.spot).toEqual(door);
  });
});
