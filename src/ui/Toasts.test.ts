import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { expect, test } from "vitest";
import { update } from "../store/progress.svelte";
import Toasts from "./Toasts.svelte";

test("passing a lesson floats its XP and announces its loot", async () => {
  render(Toasts);
  expect(screen.queryByText(/Found:/)).toBeNull();
  update((p) => ({ ...p, xp: p.xp + 35, lessons: { ...p.lessons, values: { passedAt: "2026-10-15" } } }));
  await tick();
  expect(screen.getByText("+35 XP")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toMatch(/Found: Pebble Counter/);
});
