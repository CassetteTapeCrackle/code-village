import { expect, test } from "vitest";
import { busyLabel, runnerActivity } from "./activity.svelte";

test("the busy label names the libraries while they load, and says Running otherwise", () => {
  expect(busyLabel()).toBe("Running...");
  runnerActivity.loading = ["pandas", "sklearn"];
  expect(busyLabel()).toBe("Loading pandas and scikit-learn...");
  runnerActivity.loading = null;
  expect(busyLabel()).toBe("Running...");
});
