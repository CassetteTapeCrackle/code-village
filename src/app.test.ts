import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App.svelte";
import { emptyProgress } from "./learning/types";
import { update } from "./store/progress.svelte";

afterEach(() => {
  location.hash = "";
  vi.unstubAllEnvs();
});

test("the app renders its title", () => {
  render(App);
  expect(screen.getByRole("heading", { name: "Code Village" })).toBeTruthy();
});

test("a place opens as a board over the village, which stays mounted under it", () => {
  location.hash = "#/garden";
  render(App);
  expect(screen.getByRole("heading", { name: "Garden", level: 1 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Code Village" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Back to the map/ }).getAttribute("href")).toBe("#/");
});

test("the plank is the one navigation, and number keys open its places", async () => {
  render(App);
  const plank = within(screen.getByRole("navigation", { name: "Main" }));
  expect(plank.getAllByRole("link").map((a) => a.textContent?.replace(/\d/g, "").trim())).toEqual([
    "Village",
    "School",
    "Garden",
    "Library",
    "House",
    "Sandbox",
    "Board",
  ]);
  await fireEvent.keyDown(window, { key: "4" });
  expect(location.hash).toBe("#/library");
  await fireEvent.keyDown(window, { key: "7" });
  expect(location.hash).toBe("#/board");
});

test("number keys are left alone while typing", async () => {
  render(App);
  const box = document.createElement("textarea");
  document.body.append(box);
  await fireEvent.keyDown(box, { key: "3" });
  expect(location.hash).toBe("");
  box.remove();
});

test("Escape closes a board back to the map", async () => {
  location.hash = "#/house";
  render(App);
  await tick();
  await fireEvent.keyDown(window, { key: "Escape" });
  expect(location.hash).toBe("#/");
});

test("at the level cap the plank's bar turns gold and says MAX", () => {
  update((p) => ({ ...p, xp: 99_999 }));
  render(App);
  expect(screen.getByRole("img", { name: "Max level reached" }).textContent).toBe("MAX");
  expect(screen.queryByRole("progressbar")).toBeNull();
  update(() => emptyProgress());
});

// a false DEV stands in for a production build
test("without the flag the cheat route is closed and no tag shows", () => {
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_CHEAT", "");
  location.hash = "#/cheat";
  render(App);
  expect(screen.queryByRole("heading", { name: "Cheat mode" })).toBeNull();
  expect(screen.queryByText("Cheat build")).toBeNull();
});

test("with the flag the cheat route opens and the tag shows", () => {
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_CHEAT", "1");
  location.hash = "#/cheat";
  render(App);
  expect(screen.getByRole("heading", { name: "Cheat mode" })).toBeTruthy();
  expect(screen.getByText("Cheat build")).toBeTruthy();
});
