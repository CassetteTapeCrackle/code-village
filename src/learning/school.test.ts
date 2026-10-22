import { expect, test } from "vitest";
import { article, regionToOpen, teacherGreeting } from "./school";
import { lesson, task, testBundle } from "./test-bundle";
import { emptyProgress, type Progress } from "./types";

const bundle = testBundle();
const done = { passedAt: "2026-10-13", hintsUsed: 0, checks: 1, xpEarned: 15 };

test("the teacher sends a new learner to the first lesson", () => {
  expect(teacherGreeting(bundle, emptyProgress())).toMatchObject({ lessonId: "vars" });
});

test("a half-done lesson comes first, then the next one, then the bosses", () => {
  const half: Progress = { ...emptyProgress(), tasks: { "lists-1": done } };
  expect(teacherGreeting(bundle, half)).toMatchObject({
    lessonId: "lists",
    line: expect.stringMatching(/halfway through lists/),
  });
  const first: Progress = { ...emptyProgress(), lessons: { vars: { passedAt: "2026-10-13" } } };
  expect(teacherGreeting(bundle, first)).toMatchObject({
    lessonId: "loops",
    line: "Good to see you. Next up: loops.",
  });
  const all: Progress = {
    ...emptyProgress(),
    lessons: Object.fromEntries(bundle.lessons.map((l) => [l.id, { passedAt: "2026-10-13" }])),
  };
  expect(teacherGreeting(bundle, all).lessonId).toBeNull();
  expect(teacherGreeting(bundle, emptyProgress(), "w2").lessonId).toBeNull(); // another world's lessons are not World 1's to point at
});

test("the teacher reacts to each Check, and celebrates the whole lesson", async () => {
  const { teacherLine } = await import("./school");
  const lesson = bundle.lessons[2];
  expect(teacherLine(lesson, 0, 2, "start", null)).toBe("lists rule");
  expect(teacherLine(lesson, 1, 2, "pass", "lists-2")).toBe("Well done! 1 of 2 passed. Next: lists-2.");
  expect(teacherLine(lesson, 0, 2, "fail", null)).toMatch(/first red line/);
  expect(teacherLine(lesson, 0, 2, "error", null)).toMatch(/stopped with an error/);
  expect(teacherLine(lesson, 2, 2, "pass", null)).toMatch(/lists seed is on its way/);
});

test("the seed line takes the article its concept sounds like", async () => {
  const { teacherLine } = await import("./school");
  const io = lesson("io", "a", ["io"], [task("io-1", "io")]);
  expect(teacherLine(io, 1, 1, "pass", null)).toBe(
    "That is the whole lesson! An io seed is on its way to the garden.",
  );
  expect(teacherLine(bundle.lessons[1], 1, 1, "pass", null)).toMatch(/A loops seed/);
  expect(article("io")).toBe("An");
  expect(article("errors")).toBe("An");
  expect(article("lists")).toBe("A");
});

test("the lessons board unfolds the next lesson's region, else an awake boss's, else none", () => {
  expect(regionToOpen(bundle, emptyProgress())).toBe("a");
  const half: Progress = { ...emptyProgress(), tasks: { "lists-1": done } };
  expect(regionToOpen(bundle, half)).toBe("b");
  const all: Progress = {
    ...emptyProgress(),
    lessons: Object.fromEntries(bundle.lessons.map((l) => [l.id, { passedAt: "2026-10-13" }])),
  };
  expect(regionToOpen(bundle, all)).toBe("b"); // every lesson passed: the gradebook is awake
  const beaten: Progress = {
    ...all,
    bosses: {
      gradebook: {
        stagesPassed: ["parse", "average", "ranking"],
        wonAt: "2026-10-14",
        hardWonAt: null,
        hardChecks: 0,
      },
    },
  };
  expect(regionToOpen(bundle, beaten)).toBeNull();
});
