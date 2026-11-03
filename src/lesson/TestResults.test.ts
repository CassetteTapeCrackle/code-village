import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import TestResults from "./TestResults.svelte";

test("shows each test with its message", () => {
  render(TestResults, {
    outcome: {
      kind: "ok",
      result: {
        error: null,
        results: [
          { name: "adds two", passed: true, message: "", hidden: false },
          {
            name: "empty list",
            passed: false,
            message: 'add_twice([], "a") returned [], expected ["a", "a"]',
            hidden: false,
          },
        ],
      },
    },
  });
  expect(screen.getByText("1 of 2 tests passed")).toBeTruthy();
  expect(screen.getByText(/returned \[\], expected/)).toBeTruthy();
});

test("a failed hidden case is its own line with the harness message, outside the test count", () => {
  const message = "We also tried larger(3, 7): expected 7, your code returned 3.";
  render(TestResults, {
    outcome: {
      kind: "ok",
      result: {
        error: null,
        results: [
          { name: "larger", passed: true, message: "", hidden: false },
          { name: "100 more inputs", passed: false, message, hidden: true },
        ],
      },
    },
  });
  expect(screen.getByText("1 of 1 tests passed").classList.contains("good")).toBe(false);
  expect(screen.getByText(message)).toBeTruthy();
  expect(screen.queryByText("100 more inputs")).toBeNull();
});

test("passed hidden cases show as one line", () => {
  render(TestResults, {
    outcome: {
      kind: "ok",
      result: {
        error: null,
        results: [
          { name: "larger", passed: true, message: "", hidden: false },
          { name: "100 more inputs", passed: true, message: "", hidden: true },
        ],
      },
    },
  });
  expect(screen.getByText("1 of 1 tests passed").classList.contains("good")).toBe(true);
  expect(screen.getByText("Also passed 100 more inputs")).toBeTruthy();
});

test("a timeout gets the plain message", () => {
  render(TestResults, { outcome: { kind: "timeout" } });
  expect(screen.getByText(/Still running after 5 s/)).toBeTruthy();
});

test("an error before the tests is shown instead of results", () => {
  render(TestResults, {
    outcome: { kind: "ok", result: { error: "SyntaxError on line 1: expected ':'", results: [] } },
  });
  expect(screen.getByText("SyntaxError on line 1: expected ':'")).toBeTruthy();
});

test("a failed load explains itself and offers a retry", () => {
  render(TestResults, { outcome: { kind: "unavailable", message: "offline" } });
  expect(screen.getByText(/Python could not load \(offline\)/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Try loading Python again" })).toBeTruthy();
});
