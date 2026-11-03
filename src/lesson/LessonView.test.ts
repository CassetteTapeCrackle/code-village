import { render, screen } from "@testing-library/svelte";
import { expect, test, vi } from "vitest";
import type { Lesson } from "../content/types";
import LessonView from "./LessonView.svelte";

vi.mock("../runner/shared", () => ({ getRunner: () => ({ status: () => "ready" }) }));

// jsdom has no matchMedia; a narrow screen renders the notebook layout
vi.stubGlobal("matchMedia", () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
}));

const lesson: Lesson = {
  id: "values",
  title: "Values and names",
  world: "w1",
  region: "a",
  order: 1,
  concepts: ["values"],
  remember: ["a name points at a value"],
  loot: { id: "values-loot", name: "Pocket lint" },
  blocks: [
    { type: "text", markdown: "A value." },
    {
      type: "task",
      task: {
        id: "values-total-price",
        concept: "values",
        kind: "write",
        title: "Total price",
        prompt: "Add the prices.",
        starter: "print(1)",
        tests: "",
        hints: [],
        gotcha: false,
        variants: [],
      },
    },
  ],
};

test("the lesson footer names the oldest Python it is written for", () => {
  render(LessonView, { lesson });
  expect(screen.getByText("Written for Python 3.12 and newer.")).toBeTruthy();
});

test("the lesson and its task each have a report button", () => {
  render(LessonView, { lesson });
  expect(screen.getAllByRole("button", { name: "Report a problem" })).toHaveLength(2);
});
