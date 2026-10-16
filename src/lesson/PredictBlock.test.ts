import { fireEvent, render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import PredictBlock from "./PredictBlock.svelte";

test("a right guess is accepted, ignoring spaces at the ends", async () => {
  render(PredictBlock, { code: "print([1, 2, 3])", output: "[1, 2, 3]\n" });
  await fireEvent.input(screen.getByLabelText("What does this print?"), {
    target: { value: "  [1, 2, 3] " },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Check my guess" }));
  expect(screen.getByText("Right.")).toBeTruthy();
});

test("a wrong guess shows the real output", async () => {
  render(PredictBlock, { code: "print([1, 2, 3])", output: "[1, 2, 3]\n" });
  await fireEvent.input(screen.getByLabelText("What does this print?"), { target: { value: "[1, 2]" } });
  await fireEvent.click(screen.getByRole("button", { name: "Check my guess" }));
  expect(screen.getByText(/Not quite/)).toBeTruthy();
});

test("after the guess, the code opens in an editor to run", async () => {
  render(PredictBlock, { code: "print(1)", output: "1\n" });
  expect(screen.queryByRole("button", { name: "Run" })).toBeNull();
  await fireEvent.click(screen.getByRole("button", { name: "Check my guess" }));
  expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
});
