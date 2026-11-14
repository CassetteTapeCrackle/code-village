import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SPLASH_DOORS_MS, SPLASH_SEEN_KEY, openSplash, splashWait } from "./splash";

let splash: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  document.documentElement.classList.remove("splash-seen", "splash-automated");
  splash = document.createElement("div");
  splash.id = "splash";
  document.body.append(splash);
});

afterEach(() => {
  splash.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("splashWait holds until 2 s, and never under automation", () => {
  expect(splashWait(500, false)).toBe(1500);
  expect(splashWait(2500, false)).toBe(0);
  expect(splashWait(500, true)).toBe(0);
});

test("opens the doors after the hold, marks the tab, then removes the splash", async () => {
  vi.spyOn(performance, "now").mockReturnValue(500);
  const done = openSplash();
  await vi.advanceTimersByTimeAsync(1499);
  expect(splash.classList.contains("splash-open")).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(splash.classList.contains("splash-open")).toBe(true);
  expect(sessionStorage.getItem(SPLASH_SEEN_KEY)).toBe("1");
  await vi.advanceTimersByTimeAsync(SPLASH_DOORS_MS);
  await done;
  expect(document.getElementById("splash")).toBeNull();
});

test("a reload removes the splash at once", async () => {
  document.documentElement.classList.add("splash-seen");
  await openSplash();
  expect(document.getElementById("splash")).toBeNull();
});

test("blocked storage still opens the doors", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(performance, "now").mockReturnValue(3000);
  const done = openSplash();
  await vi.advanceTimersByTimeAsync(SPLASH_DOORS_MS);
  await done;
  expect(document.getElementById("splash")).toBeNull();
});

test("a second call while the first waits does nothing more", async () => {
  const setItem = vi.spyOn(Storage.prototype, "setItem");
  vi.spyOn(performance, "now").mockReturnValue(500);
  const first = openSplash();
  const second = openSplash();
  await vi.runAllTimersAsync();
  await Promise.all([first, second]);
  expect(setItem).toHaveBeenCalledTimes(1);
});

test("no splash on the page is fine", async () => {
  splash.remove();
  await expect(openSplash()).resolves.toBeUndefined();
});

test("the gate script reads the same key and sets the same class", () => {
  const gate = readFileSync("public/splash-gate.js", "utf8");
  expect(gate).toContain(SPLASH_SEEN_KEY);
  expect(gate).toContain("splash-seen");
});

// The gate is a classic script in <head>, so the test runs its real source.
const runGate = (): void => void new Function(readFileSync("public/splash-gate.js", "utf8"))();

test("the gate hides the splash on a reload, not in a new tab", () => {
  runGate();
  expect(document.documentElement.classList.contains("splash-seen")).toBe(false);
  sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  runGate();
  expect(document.documentElement.classList.contains("splash-seen")).toBe(true);
});

test("under automation the splash lets clicks through from the first paint", () => {
  Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
  try {
    runGate();
    expect(document.documentElement.classList.contains("splash-automated")).toBe(true);
  } finally {
    Reflect.deleteProperty(navigator, "webdriver");
  }
});
