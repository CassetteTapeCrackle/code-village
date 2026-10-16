import { render, screen, within } from "@testing-library/svelte";
import { expect, test } from "vitest";
import { update } from "../store/progress.svelte";
import Village from "./Village.svelte";

const places = (): HTMLElement => screen.getByRole("navigation", { name: "Places" });

test("the places list reaches every building without the map", () => {
  render(Village);
  expect(screen.getByRole("heading", { name: "Code Village" })).toBeTruthy();
  const list = within(places());
  for (const [name, href] of [
    ["School", "#/school"],
    ["Garden", "#/garden"],
    ["Library", "#/library"],
    ["Your house", "#/house"],
  ]) {
    expect(list.getByRole("link", { name }).getAttribute("href")).toBe(href);
  }
});

test("a lair is asleep until its region's lessons are passed, then links to its boss", () => {
  const first = render(Village);
  expect(within(places()).queryByRole("link", { name: /The marsh/ })).toBeNull();
  expect(within(places()).getByText(/The marsh: The Gradebook/)).toBeTruthy();
  first.unmount();
  const passed = { passedAt: "2026-10-12" };
  const collections = Object.fromEntries(
    ["strings", "lists", "grids", "dicts", "comprehensions"].map((id) => [id, passed]),
  );
  update((p) => ({ ...p, lessons: collections, plants: { gone: { stage: 0, due: "2000-01-01" } } }));
  render(Village);
  expect(within(places()).getByRole("link", { name: "The marsh: The Gradebook" }).getAttribute("href")).toBe(
    "#/boss/gradebook",
  );
});
