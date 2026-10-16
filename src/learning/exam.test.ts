import { expect, test } from "vitest";
import { buildExam, examResult, finishExam, formatLeft, recap, worlds } from "./exam";
import { testBundle } from "./test-bundle";
import { emptyProgress } from "./types";

const bundle = testBundle();

test("the recap lists a world's lessons with their remember lines", () => {
  expect(worlds(bundle)).toEqual(["w1"]);
  expect(recap(bundle, "w1").map((r) => r.lessonId)).toEqual(["vars", "loops", "lists"]);
  expect(recap(bundle, "w1")[2].remember).toEqual(["lists rule"]);
});

test("a mock exam has one exercise per concept, avoids the last reviewed one, and is shuffled", () => {
  const p = { ...emptyProgress(), reviewLast: { vars: "vars-1" } };
  // with random() always 0: picks are [vars-1b, loops-1, lists-1], then the shuffle gives this order
  expect(buildExam(bundle, p, ["w1"], () => 0).map((e) => e.id)).toEqual(["loops-1", "lists-1", "vars-1b"]);
  expect(buildExam(bundle, p, ["w2"])).toEqual([]);
});

test("the result scores each concept and links weak ones to their lesson", () => {
  const exam = buildExam(bundle, emptyProgress(), ["w1"], () => 0);
  const scores = examResult(bundle, exam, new Set(["lists-1"]));
  expect(scores.find((s) => s.concept === "lists")).toEqual({
    concept: "lists",
    passed: true,
    lessonId: "lists",
  });
  expect(scores.find((s) => s.concept === "loops")).toEqual({
    concept: "loops",
    passed: false,
    lessonId: "loops",
  });
});

test("finishing an exam pays 10 XP and never touches plants", () => {
  const p = { ...emptyProgress(), plants: { lists: { stage: 1 as const, due: "2026-10-10" } } };
  expect(finishExam(p)).toEqual({ ...p, xp: 10 });
});

test("time left reads as minutes and seconds", () => {
  expect([formatLeft(61_000), formatLeft(59_500), formatLeft(0), formatLeft(-5)]).toEqual([
    "1:01",
    "1:00",
    "0:00",
    "0:00",
  ]);
});
