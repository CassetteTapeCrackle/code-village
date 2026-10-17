import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, expect, test, vi } from "vitest";
import { update } from "../store/progress.svelte";
import { SPOTS } from "../village/layout";
import Toasts from "./Toasts.svelte";
import { announceLevel, clearLevelToast, moments } from "./moments.svelte";
import { clearShowMe, showMe } from "./showme.svelte";

const news = {
  level: 4,
  items: [
    { level: 3, id: "stall", name: "A market stall in the square" },
    { level: 3, id: "flowers", name: "Flower beds around the square" },
    { level: 4, id: "fountain", name: "A fountain in the square" },
    { level: 4, id: "ducks", name: "Ducks on the river" },
  ],
};

afterEach(() => {
  clearLevelToast();
  clearShowMe();
  vi.useRealTimers();
});

test("passing a lesson floats its XP and announces its loot", async () => {
  render(Toasts);
  expect(screen.queryByText(/Found:/)).toBeNull();
  update((p) => ({ ...p, xp: p.xp + 35, lessons: { ...p.lessons, values: { passedAt: "2026-10-15" } } }));
  await tick();
  expect(screen.getByText("+35 XP")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toMatch(/Found: Pebble Counter/);
});

test("a level toast names three new things, counts the rest, and Show me points at them", async () => {
  render(Toasts);
  announceLevel(news);
  await tick();
  expect(screen.getByText("Level 4")).toBeTruthy();
  expect(
    screen.getByText(
      "A market stall in the square, Flower beds around the square, A fountain in the square and 1 more",
    ),
  ).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Show me" }));
  expect(showMe.at).toEqual(SPOTS.stall);
  expect(showMe.spots).toEqual([SPOTS.stall, SPOTS.flowers, SPOTS.fountain, SPOTS.ducks]);
  expect(showMe.label).toBe(
    "New at level 4: A market stall in the square, Flower beds around the square, A fountain in the square, Ducks on the river",
  );
  expect(moments.level).toBeNull();
});

test("a level toast leaves on its own after eight seconds", async () => {
  vi.useFakeTimers();
  render(Toasts);
  announceLevel(news);
  await tick();
  expect(screen.getByText("Level 4")).toBeTruthy();
  vi.advanceTimersByTime(7999);
  await tick();
  expect(screen.getByText("Level 4")).toBeTruthy();
  vi.advanceTimersByTime(1);
  await tick();
  expect(screen.queryByText("Level 4")).toBeNull();
});

test("Escape closes the level toast", async () => {
  render(Toasts);
  announceLevel(news);
  await tick();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  await tick();
  expect(screen.queryByText("Level 4")).toBeNull();
});
