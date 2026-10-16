import { expect, test } from "vitest";
import { bossOpen, hardOpen } from "./access";
import {
  bossHp,
  bossState,
  hardChecksLeft,
  newHardAttempt,
  passStages,
  recordHardCheck,
  rematchBoss,
  winHard,
} from "./boss";
import { testBundle } from "./test-bundle";
import { emptyProgress } from "./types";

const bundle = testBundle();
const gb = bundle.bosses[0];
const D = "2026-10-12";

test("each new stage pays 40 XP and takes its HP; the last one wins the boss for 100 more", () => {
  let p = passStages(emptyProgress(), gb, ["parse"], D);
  expect(p.xp).toBe(40);
  expect(bossHp(gb, bossState(p, "gradebook"))).toEqual({ left: 20, total: 30 });
  p = passStages(p, gb, ["parse", "average"], D);
  expect(p.xp).toBe(80);
  expect(bossState(p, "gradebook").wonAt).toBeNull();
  p = passStages(p, gb, ["ranking"], D);
  expect(p.xp).toBe(80 + 40 + 100);
  expect(bossState(p, "gradebook")).toMatchObject({
    wonAt: D,
    stagesPassed: ["parse", "average", "ranking"],
  });
  expect(bossHp(gb, bossState(p, "gradebook")).left).toBe(0);
});

test("stages already beaten or unknown change nothing", () => {
  const p = passStages(emptyProgress(), gb, ["parse"], D);
  expect(passStages(p, gb, ["parse", "nope"], D)).toBe(p);
});

test("a rematch refills the HP and clears the code but keeps the win, and pays no XP", () => {
  const all = gb.stages.map((s) => s.id);
  const won = {
    ...passStages(emptyProgress(), gb, all, D),
    drafts: { "boss:gradebook": "solved", other: "kept" },
  };
  expect(rematchBoss(emptyProgress(), gb)).toEqual(emptyProgress());
  const again = rematchBoss(won, gb);
  expect(bossState(again, "gradebook")).toMatchObject({ stagesPassed: [], wonAt: D });
  expect(bossHp(gb, bossState(again, "gradebook")).left).toBe(30);
  expect(again.drafts).toEqual({ other: "kept" });
  const rewon = passStages(again, gb, all, "2026-10-20");
  expect(rewon.xp).toBe(won.xp);
  expect(bossState(rewon, "gradebook").wonAt).toBe(D);
});

test("hard mode: Checks run out, a new attempt refills them, a win pays 150 once", () => {
  let p = recordHardCheck(recordHardCheck(emptyProgress(), gb), gb);
  expect(hardChecksLeft(gb, bossState(p, "gradebook"))).toBe(0);
  p = newHardAttempt(p, gb);
  expect(hardChecksLeft(gb, bossState(p, "gradebook"))).toBe(2);
  p = winHard(p, gb, D);
  expect(p.xp).toBe(150);
  expect(bossState(p, "gradebook").hardWonAt).toBe(D);
  expect(winHard(p, gb, D)).toBe(p);
});

test("a boss opens when its region's lessons are all passed; hard mode after the normal win", () => {
  const passed = (...lessonIds: string[]) => ({
    ...emptyProgress(),
    lessons: Object.fromEntries(lessonIds.map((id) => [id, { passedAt: D }])),
  });
  expect(bossOpen(bundle, passed("vars", "loops"), gb)).toBe(false);
  expect(bossOpen(bundle, passed("lists"), gb)).toBe(true);
  expect(hardOpen(emptyProgress(), gb)).toBe(false);
  expect(hardOpen(passStages(emptyProgress(), gb, ["parse", "average", "ranking"], D), gb)).toBe(true);
});
