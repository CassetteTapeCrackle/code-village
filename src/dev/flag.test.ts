import { afterEach, expect, test, vi } from "vitest";
import { cheatBuild, cheatsEnabled } from "./flag";

afterEach(() => vi.unstubAllEnvs());

// a false DEV stands in for a production build
test("a development build has the cheat tools and no tag", () => {
  vi.stubEnv("DEV", true);
  vi.stubEnv("VITE_CHEAT", "");
  expect(cheatsEnabled()).toBe(true);
  expect(cheatBuild()).toBe(false);
});

test("a production build without the flag has neither", () => {
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_CHEAT", "");
  expect(cheatsEnabled()).toBe(false);
  expect(cheatBuild()).toBe(false);
});

test("VITE_CHEAT=1 in a production build adds the tools and the tag", () => {
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_CHEAT", "1");
  expect(cheatsEnabled()).toBe(true);
  expect(cheatBuild()).toBe(true);
});
