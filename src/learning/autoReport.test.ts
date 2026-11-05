import { expect, test } from "vitest";
import type { CheckResult, TestResult } from "../runner/protocol";
import { autoReportMessage, claimAutoReport, shouldAutoReport } from "./autoReport";

const visible = (passed: boolean, message = ""): TestResult => ({
  name: "adds",
  passed,
  message,
  hidden: false,
});
const hidden = (passed: boolean): TestResult => ({
  name: "hidden cases",
  passed,
  message: passed ? "" : "We also tried add(1, 2): expected 3, your code returned 4.",
  hidden: true,
});
const result = (...results: TestResult[]): CheckResult => ({ error: null, results });

test("code that passes every hidden case but fails a visible test is reported", () => {
  expect(shouldAutoReport(result(visible(false, "returned 3, expected 4"), hidden(true)))).toBe(true);
});

test("a hidden case that fails means the learner's code is wrong, not the test", () => {
  expect(shouldAutoReport(result(visible(false), hidden(false)))).toBe(false);
});

test("without hidden cases nothing vouches for the code, so nothing is reported", () => {
  expect(shouldAutoReport(result(visible(false)))).toBe(false);
});

test("a full pass and a syntax error are never reported", () => {
  expect(shouldAutoReport(result(visible(true), hidden(true)))).toBe(false);
  expect(shouldAutoReport({ error: "SyntaxError: invalid syntax (line 1)", results: [] })).toBe(false);
});

test("the report carries the first failing visible test's message", () => {
  const r = result(visible(true, ""), visible(false, "returned 3, expected 4"), hidden(true));
  expect(autoReportMessage(r)).toBe("adds: returned 3, expected 4");
});

test("each item is reported at most once per session", () => {
  expect(claimAutoReport("lists-last-item")).toBe(true);
  expect(claimAutoReport("lists-last-item")).toBe(false);
  expect(claimAutoReport("strings-last-word")).toBe(true);
});
