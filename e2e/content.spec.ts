import { expect, test } from "./fixtures";
import { showTask, typeCode } from "./helpers";

test("a whole-program task reads its input in the browser", async ({ page }) => {
  await page.goto("/#/lesson/input-output");
  await showTask(page, "Say hello");
  await typeCode(page, "Say hello", 'name = input()\nprint(f"Hello, {name}!")\n');
  await page.getByRole("region", { name: "Say hello" }).getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("region", { name: "Say hello" }).getByText("Passed. +15 XP")).toBeVisible({
    timeout: 60_000,
  });
});

test("runaway recursion reports RecursionError instead of crashing Python", async ({ page }) => {
  await page.goto("/#/lesson/recursion");
  await showTask(page, "It never stops");
  const task = page.getByRole("region", { name: "It never stops" });
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText(/RecursionError/).first()).toBeVisible({ timeout: 60_000 });
  // Python still works afterwards
  await showTask(page, "It never stops");
  await typeCode(
    page,
    "It never stops",
    "def power(base, exp):\n    if exp == 0:\n        return 1\n    return base * power(base, exp - 1)\n",
  );
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("Passed. +15 XP")).toBeVisible({ timeout: 60_000 });
});
