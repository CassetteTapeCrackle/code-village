import { render, screen, within } from "@testing-library/svelte";
import { afterEach, expect, test } from "vitest";
import SchoolView from "../screens/SchoolView.svelte";
import { update } from "../store/progress.svelte";
import Village from "../village/Village.svelte";
import { teacherFor } from "../learning/school";
import { emptyProgress } from "../learning/types";
import { forgetClosed, unseenOpened } from "./registry";

const lantern = (): void =>
  update((p) => ({
    ...p,
    bosses: { "lost-satchel": { stagesPassed: [], wonAt: "2026-10-12", hardWonAt: null, hardChecks: 0 } },
  }));
const badge = (): void =>
  update((p) => ({
    ...p,
    bosses: { "ranger-registry": { stagesPassed: [], wonAt: "2026-10-13", hardWonAt: null, hardChecks: 0 } },
  }));
const places = (): HTMLElement => screen.getByRole("navigation", { name: "Places" });

afterEach(() => {
  update(() => emptyProgress());
  localStorage.clear();
});

test("a banner is due for each opened world not seen yet, counting World 1 as seen", () => {
  expect(unseenOpened(["w1"], null)).toEqual([]);
  expect(unseenOpened(["w1", "w2"], null)).toEqual(["w2"]);
  expect(unseenOpened(["w1", "w2"], ["w1", "w2"])).toEqual([]);
});

test("the ranger's cabin is behind a blocked road until the Ruin Lantern is won", () => {
  render(SchoolView, { world: "w2" });
  expect(screen.getByRole("heading", { name: "The road is still blocked" })).toBeTruthy();
  expect(screen.getByText(/A light might help/)).toBeTruthy();
});

test("an unknown world is not found, rather than blocked", () => {
  render(SchoolView, { world: "w9" });
  expect(screen.getByRole("heading", { name: "Nothing here" })).toBeTruthy();
});

test("forgetting a world (a reset) lets its banner show again when it reopens", () => {
  expect(unseenOpened(["w1", "w2"], ["w1"])).toEqual(["w2"]);
  expect(forgetClosed(["w1", "w2"], ["w1"])).toEqual(["w1"]);
});

test("with the Ruin Lantern the cabin opens, with Ranger Noa and the forest's lessons", () => {
  lantern();
  render(SchoolView, { world: "w2" });
  expect(screen.getByRole("heading", { name: "Ranger's cabin" })).toBeTruthy();
  expect(screen.getByText("Ranger Noa")).toBeTruthy();
  expect(screen.getAllByRole("link", { name: /Classes and objects/ }).length).toBeGreaterThan(0); // the lead card and its row
});

test("with the Ranger's Badge the observatory opens; Stargazer Alex teaches there", () => {
  badge();
  render(SchoolView, { world: "w3" });
  expect(screen.getByRole("heading", { name: "Observatory" })).toBeTruthy();
  expect(teacherFor("w3")).toEqual({ name: "Stargazer Alex", portrait: "stargazer" });
});

test("the village lists the forest only once its road is open, and announces it once", () => {
  const first = render(Village);
  expect(within(places()).queryByRole("link", { name: "Ranger's cabin" })).toBeNull();
  expect(within(places()).getByText(/The road to the Forest/)).toBeTruthy();
  first.unmount();
  lantern();
  const second = render(Village);
  expect(within(places()).getByRole("link", { name: "Ranger's cabin" }).getAttribute("href")).toBe(
    "#/school/w2",
  );
  const banner = screen.getByRole("dialog", { name: "The Forest" });
  expect(document.activeElement).toBe(within(banner).getByRole("button", { name: "Show me" })); // keyboard users land on it
  banner.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); // Escape means Later
  second.unmount();
  render(Village);
  expect(screen.queryByRole("dialog", { name: "The Forest" })).toBeNull();
});

test("a villager's bubble fades after a few seconds, even when the frame loop is not running", async () => {
  const { vi } = await import("vitest");
  vi.useFakeTimers();
  render(Village);
  screen.getByRole("button", { name: /^Ines, / }).click();
  await Promise.resolve();
  expect(document.querySelector(".talk-bubble")).not.toBeNull();
  vi.advanceTimersByTime(3900); // it stays up four seconds
  await Promise.resolve();
  expect(document.querySelector(".talk-bubble")).not.toBeNull();
  vi.advanceTimersByTime(100);
  await Promise.resolve();
  expect(document.querySelector(".talk-bubble")).toBeNull();
  vi.useRealTimers();
});

test("moving the pointer around the map leaves a villager's bubble up", async () => {
  render(Village);
  screen.getByRole("button", { name: /^Ines, / }).click();
  await Promise.resolve();
  document
    .querySelector(".world")!
    .dispatchEvent(new PointerEvent("pointermove", { clientX: 1, clientY: 1, bubbles: true }));
  await Promise.resolve();
  expect(document.querySelector(".talk-bubble")).not.toBeNull();
});
