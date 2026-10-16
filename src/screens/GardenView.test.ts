import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import { update } from "../store/progress.svelte";
import GardenView from "./GardenView.svelte";

test("an empty garden says how to plant", () => {
  render(GardenView);
  expect(screen.getByText(/Nothing planted yet/)).toBeTruthy();
});

test("a late plant wilts and offers a review; plants of removed concepts are hidden", () => {
  update((p) => ({
    ...p,
    plants: { lists: { stage: 0, due: "2000-01-01" }, gone: { stage: 3, due: "2000-01-01" } },
  }));
  render(GardenView);
  expect(screen.getByText(/1 wilting/)).toBeTruthy();
  expect(screen.queryByText(/Plant notes/)).toBeNull();
  expect(screen.queryByText("gone")).toBeNull();
  expect(screen.getByRole("button", { name: "Start today's review (1)" })).toBeTruthy();
});
