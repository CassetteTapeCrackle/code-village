import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  SPLASH_DOORS_MS,
  SPLASH_GIVE_UP_MS,
  SPLASH_SEEN_KEY,
  holdAppBehindSplash,
  openSplash,
  splashWait,
} from "./splash";

let splash: HTMLElement;
let app: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  document.documentElement.classList.remove("splash-seen", "splash-automated");
  splash = document.createElement("div");
  splash.id = "splash";
  app = document.createElement("div");
  app.id = "app";
  document.body.append(splash, app);
});

afterEach(() => {
  splash.remove();
  app.remove();
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

test("the village behind the splash takes no focus until the doors open", async () => {
  vi.spyOn(performance, "now").mockReturnValue(500);
  holdAppBehindSplash();
  expect(app.hasAttribute("inert")).toBe(true);
  const done = openSplash();
  await vi.advanceTimersByTimeAsync(1500);
  expect(splash.classList.contains("splash-open")).toBe(true);
  expect(app.hasAttribute("inert")).toBe(false);
  await vi.advanceTimersByTimeAsync(SPLASH_DOORS_MS);
  await done;
});

test("a reload or an automated browser never holds the village", () => {
  document.documentElement.classList.add("splash-seen");
  holdAppBehindSplash();
  expect(app.hasAttribute("inert")).toBe(false);
  document.documentElement.classList.remove("splash-seen");
  Object.defineProperty(navigator, "webdriver", { value: true, configurable: true });
  try {
    holdAppBehindSplash();
    expect(app.hasAttribute("inert")).toBe(false);
  } finally {
    Reflect.deleteProperty(navigator, "webdriver");
  }
});

test("a village that never paints still frees the page at 10 s, without the doors", async () => {
  vi.spyOn(performance, "now").mockReturnValue(500);
  holdAppBehindSplash();
  await vi.advanceTimersByTimeAsync(SPLASH_GIVE_UP_MS - 500 - 1);
  expect(document.getElementById("splash")).not.toBeNull();
  vi.spyOn(performance, "now").mockReturnValue(SPLASH_GIVE_UP_MS);
  // 2, not 1: fake timers push the 0 ms wait that the give-up sets mid-tick to 1 ms
  await vi.advanceTimersByTimeAsync(2);
  expect(document.getElementById("splash")).toBeNull();
  expect(splash.classList.contains("splash-open")).toBe(false);
  expect(app.hasAttribute("inert")).toBe(false);
});

test("doors that start just before 10 s finish their slide", async () => {
  vi.spyOn(performance, "now").mockReturnValue(9500);
  holdAppBehindSplash();
  const done = openSplash();
  await vi.advanceTimersByTimeAsync(1);
  expect(splash.classList.contains("splash-open")).toBe(true);
  vi.spyOn(performance, "now").mockReturnValue(SPLASH_GIVE_UP_MS);
  await vi.advanceTimersByTimeAsync(500);
  expect(document.getElementById("splash")).not.toBeNull();
  await vi.advanceTimersByTimeAsync(SPLASH_DOORS_MS);
  await done;
  expect(document.getElementById("splash")).toBeNull();
  // the CSS give-up must not hide the doors mid-slide either
  expect(readFileSync("src/splash/splash.css", "utf8")).toMatch(
    /#splash\.splash-open \{[^}]*animation: none;/,
  );
});

test("a font load that never finishes cannot hold the village past 10 s", async () => {
  Object.defineProperty(document, "fonts", { value: { ready: new Promise(() => {}) }, configurable: true });
  try {
    vi.spyOn(performance, "now").mockReturnValue(500);
    holdAppBehindSplash();
    void openSplash(); // the village painted, the splash font is still loading
    await vi.advanceTimersByTimeAsync(SPLASH_GIVE_UP_MS - 500);
    expect(document.getElementById("splash")).toBeNull();
    expect(app.hasAttribute("inert")).toBe(false);
  } finally {
    Reflect.deleteProperty(document, "fonts");
  }
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
