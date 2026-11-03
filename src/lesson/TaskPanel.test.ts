import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Lesson, Task } from "../content/types";
import { signIn, signOut } from "../store/account.svelte";
import { TOUR_TASK_ID, freshTour } from "../tour/tour";
import { tour } from "../tour/tour.svelte";
import TaskPanel from "./TaskPanel.svelte";

const runner = vi.hoisted(() => ({
  check: async () => ({
    kind: "ok" as const,
    result: { error: null, results: [{ name: "adds", passed: false, message: "returned 3, expected 4" }] },
  }),
  run: async () => ({ kind: "timeout" as const }),
  status: () => "ready" as const,
  retry: () => {},
}));
vi.mock("../runner/shared", () => ({ getRunner: () => runner }));

const lesson: Lesson = {
  id: "values",
  title: "Values and names",
  world: "w1",
  region: "a",
  order: 1,
  concepts: ["values"],
  remember: ["a name points at a value"],
  loot: { id: "values-loot", name: "Pocket lint" },
  blocks: [],
};

const task: Task = {
  id: "values-total-price",
  concept: "values",
  kind: "write",
  title: "Total price",
  prompt: "Add the prices.",
  starter: "print(1)",
  tests: "def test_hidden():\n    expect_equal(1, 2)",
  hints: ["Start at zero."],
  gotcha: false,
  variants: [],
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
});

afterEach(() => {
  signOut();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("a Check queues a snapshot of the code and its results for the server", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return Promise.resolve(
      new Response(JSON.stringify({ accepted: 0, rejected: [], revision: 1 }), { status: 200 }),
    );
  });
  render(TaskPanel, { lesson, task });
  await fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await vi.advanceTimersByTimeAsync(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(calls).toHaveLength(1);
  const sent = JSON.parse(String(calls[0].init.body)) as { snapshot: unknown };
  expect(sent.snapshot).toEqual({
    taskId: task.id,
    code: "print(1)",
    check: { error: null, results: [{ name: "adds", passed: false, message: "returned 3, expected 4" }] },
    checks: 1,
    hints: 0,
  });
});

test("Run on the tour task moves the tour on without input lines", async () => {
  vi.useRealTimers();
  tour.state = { ...freshTour(), step: "run" };
  render(TaskPanel, { lesson, task: { ...task, id: TOUR_TASK_ID } });
  await fireEvent.click(screen.getByRole("button", { name: "Run" }));
  await vi.waitFor(() => expect(tour.state.step).toBe("check"));
});

test("the line under the editor says what an automatic report sends", () => {
  render(TaskPanel, { lesson, task });
  expect(
    screen.getByText(
      "If Check looks wrong, we send your code anonymously so we can fix it and improve the site.",
    ),
  ).toBeTruthy();
});

test("a task has its own report button", () => {
  render(TaskPanel, { lesson, task });
  expect(screen.getByRole("button", { name: "Report a problem" })).toBeTruthy();
});
