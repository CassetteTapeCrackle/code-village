import { fireEvent, render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import { emptyProgress } from "../learning/types";
import { game, update } from "../store/progress.svelte";
import { exportProgress } from "../store/storage";
import HouseView from "./HouseView.svelte";

const file = (text: string): File => new File([text], "save.json", { type: "application/json" });

test("the shelf shows only what was found, and one tile for the rest", () => {
  render(HouseView);
  expect(screen.queryByText("?")).toBeNull();
  expect(screen.getByText(/still out there/)).toBeTruthy();
});

test("village growth is a level track: a level opens its decorations, and the next one is named once", async () => {
  render(HouseView);
  expect(screen.queryByText(/\(in the village\)/)).toBeNull();
  expect(screen.getAllByText(/lanterns along the main street/i)).toHaveLength(1); // the "next" line, not a list
  await fireEvent.click(screen.getByRole("button", { name: /^Level 2:/ }));
  expect(screen.getByText("Lou the baker moves in")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Show me" })).toBeNull(); // not built yet at level 1
});

test("at the level cap the house says so instead of naming a next level", () => {
  update((p) => ({ ...p, xp: 99_999 }));
  render(HouseView);
  expect(screen.getByText(/Max level reached/)).toBeTruthy();
  expect(screen.queryByText(/XP to go/)).toBeNull();
  update(() => emptyProgress());
});

test("a file that is not a save is refused and nothing changes", async () => {
  render(HouseView);
  await fireEvent.change(screen.getByLabelText("Load a save file"), { target: { files: [file("hello")] } });
  expect(await screen.findByText("This file is not a Code Village save.")).toBeTruthy();
  expect(game.progress.xp).toBe(0);
});

test("a good save replaces progress only after confirming", async () => {
  render(HouseView);
  const save = exportProgress({ ...emptyProgress(), xp: 99 });
  await fireEvent.change(screen.getByLabelText("Load a save file"), { target: { files: [file(save)] } });
  expect(await screen.findByText(/This save has 99 XP/)).toBeTruthy();
  expect(game.progress.xp).toBe(0);
  await fireEvent.click(screen.getByRole("button", { name: "Replace my progress" }));
  expect(game.progress.xp).toBe(99);
});
