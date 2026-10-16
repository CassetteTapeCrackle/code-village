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
          { name: "adds two", passed: true, message: "" },
          {
            name: "empty list",
            passed: false,
            message: 'add_twice([], "a") returned [], expected ["a", "a"]',
          },
        ],
      },
    },
  });
  expect(screen.getByText("1 of 2 tests passed")).toBeTruthy();
  expect(screen.getByText(/returned \[\], expected/)).toBeTruthy();
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
