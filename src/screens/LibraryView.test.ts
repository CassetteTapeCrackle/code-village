import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { expect, test } from "vitest";
import LibraryView from "./LibraryView.svelte";

test("the recap is folded per lesson; a fold opens its remember lines", async () => {
  render(LibraryView);
  expect(screen.queryByText(/b = a does not copy a list/)).toBeNull();
  await fireEvent.click(screen.getByRole("button", { name: /^Lists \d+ lines$/ }));
  expect(screen.getByText(/b = a does not copy a list/)).toBeTruthy();
});

test("searching the recap opens the folds it matches and marks the words", async () => {
  render(LibraryView);
  await fireEvent.input(screen.getByRole("searchbox"), { target: { value: "does not copy" } });
  expect(screen.getByText("does not copy").tagName).toBe("MARK");
  expect(screen.getAllByRole("button", { expanded: true }).length).toBeGreaterThan(0);
  await fireEvent.input(screen.getByRole("searchbox"), { target: { value: "zzz-nothing" } });
  expect(screen.getByText(/Nothing matches/)).toBeTruthy();
});

test("the mock exam needs at least one world", async () => {
  render(LibraryView);
  const start = screen.getByRole("button", { name: "Start the mock exam" }) as HTMLButtonElement;
  expect(start.disabled).toBe(false);
  const exam = within(screen.getByRole("region", { name: "Mock exam" }));
  await fireEvent.click(exam.getByLabelText("The Village"));
  await fireEvent.click(exam.getByLabelText("The Forest"));
  expect(start.disabled).toBe(false); // the Mountains are still chosen
  await fireEvent.click(exam.getByLabelText("The Mountains"));
  expect(start.disabled).toBe(true);
});
