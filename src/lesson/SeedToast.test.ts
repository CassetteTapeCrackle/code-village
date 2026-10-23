import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import SeedToast from "./SeedToast.svelte";

test("one line per planted concept, and a way to the garden", () => {
  render(SeedToast, { concepts: ["lists", "loops"] });
  expect(screen.getByText("A lists seed was planted in the garden.")).toBeTruthy();
  expect(screen.getByText("A loops seed was planted in the garden.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "See the garden" }).getAttribute("href")).toBe("#/garden");
});

test("a concept starting with a vowel gets 'An'", () => {
  render(SeedToast, { concepts: ["io"] });
  expect(screen.getByText("An io seed was planted in the garden.")).toBeTruthy();
});
