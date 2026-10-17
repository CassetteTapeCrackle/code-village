import { expect, test } from "vitest";
import { testBundle } from "../learning/test-bundle";
import { emptyProgress, type Progress } from "../learning/types";
import { levelSummary, momentsBetween } from "./celebrate";

const bundle = testBundle();
const passed = { passedAt: "2026-10-15" };

test("nothing changed, nothing to celebrate", () => {
  expect(momentsBetween(bundle, emptyProgress(), emptyProgress())).toEqual({ xp: 0, toasts: [] });
});

test("a task's XP floats up without a ribbon", () => {
  expect(momentsBetween(bundle, emptyProgress(), { ...emptyProgress(), xp: 15 })).toEqual({
    xp: 15,
    toasts: [],
  });
});

test("passing a lesson finds its loot", () => {
  const after: Progress = { ...emptyProgress(), xp: 35, lessons: { vars: passed } };
  expect(momentsBetween(bundle, emptyProgress(), after)).toEqual({
    xp: 35,
    toasts: [{ kind: "loot", text: "Found: vars loot", item: "vars-loot" }],
  });
});

test("beating a boss wins its trophy", () => {
  const before: Progress = { ...emptyProgress(), xp: 90 };
  const after: Progress = {
    ...before,
    xp: 190,
    bosses: {
      gradebook: {
        stagesPassed: ["parse", "average", "ranking"],
        wonAt: "2026-10-15",
        hardWonAt: null,
        hardChecks: 0,
      },
    },
  };
  const { toasts } = momentsBetween(bundle, before, after);
  expect(toasts.map((t) => t.kind)).toEqual(["trophy"]);
});

test("a level's summary names three new things, then counts the rest", () => {
  expect(levelSummary(["Lanterns"])).toBe("Lanterns");
  expect(levelSummary(["Lanterns", "Lou", "Stall"])).toBe("Lanterns, Lou, Stall");
  expect(levelSummary(["Lanterns", "Lou", "Stall", "Flowers", "Fountain"])).toBe(
    "Lanterns, Lou, Stall and 2 more",
  );
});

test("a loaded save or a cheat (lots of news at once) is not celebrated", () => {
  const all: Progress = {
    ...emptyProgress(),
    xp: 2000,
    lessons: Object.fromEntries(bundle.lessons.map((l) => [l.id, passed])),
    bosses: {
      gradebook: {
        stagesPassed: [],
        wonAt: "2026-10-15",
        hardWonAt: null,
        hardChecks: 0,
      },
    },
  };
  expect(momentsBetween(bundle, emptyProgress(), all)).toEqual({ xp: 0, toasts: [] });
});

test("losing XP (a reset) floats nothing", () => {
  expect(momentsBetween(bundle, { ...emptyProgress(), xp: 50 }, emptyProgress()).xp).toBe(0);
});
