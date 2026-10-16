import { afterEach, expect, test, vi } from "vitest";
import { onIdle } from "./idle";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("it asks requestIdleCallback for the deadline when there is one", () => {
  const requestIdle = vi.fn();
  vi.stubGlobal("requestIdleCallback", requestIdle);
  const task = vi.fn();

  onIdle(task, 500);

  expect(requestIdle).toHaveBeenCalledWith(task, { timeout: 500 });
});

test("it falls back to a timer, so the task still runs where requestIdleCallback is missing", () => {
  vi.stubGlobal("requestIdleCallback", undefined);
  vi.useFakeTimers();
  const task = vi.fn();

  onIdle(task, 500);
  expect(task).not.toHaveBeenCalled();
  vi.advanceTimersByTime(500);
  expect(task).toHaveBeenCalledTimes(1);
});
