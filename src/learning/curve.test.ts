import { expect, test } from "vitest";
import { bundle } from "../content/bundle";
import { MAX_LEVEL, XP, levelFor, xpForLevel } from "./xp";

// Owner decision 2026-10-15: a clean run of all content reaches level 9, and every hard mode on top reaches the cap.
// If new content moves these numbers, that is a design question for the owner, not a test to loosen.
function cleanRunXp(): number {
  const tasks = bundle.lessons.flatMap((l) => l.blocks).filter((b) => b.type === "task").length;
  const stages = bundle.bosses.reduce((sum, b) => sum + b.stages.length, 0);
  return (
    tasks * XP.taskClean +
    bundle.lessons.length * XP.lesson +
    stages * XP.bossStage +
    bundle.bosses.length * XP.bossWin
  );
}

test("the level cap is the owner's 11, not just whatever the code says", () => {
  expect(MAX_LEVEL).toBe(11);
});

test("a clean run of every lesson, task and boss reaches level 9", () => {
  const total = cleanRunXp();
  expect(levelFor(total), `clean run gives ${total} XP`).toBe(9);
});

test("every hard mode on top of a clean run reaches the level cap", () => {
  const total = cleanRunXp() + bundle.bosses.length * XP.hardWin;
  expect(total, `full run gives ${total} XP, the cap needs ${xpForLevel(MAX_LEVEL)}`).toBeGreaterThanOrEqual(
    xpForLevel(MAX_LEVEL),
  );
  expect(levelFor(total)).toBe(MAX_LEVEL);
});

test("the cap is out of reach without hard modes, so they stay worth doing", () => {
  const total = cleanRunXp();
  expect(total, `clean run gives ${total} XP, must stay below the cap ${xpForLevel(MAX_LEVEL)}`).toBeLessThan(
    xpForLevel(MAX_LEVEL),
  );
});
