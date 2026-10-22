import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const SOLUTION = readFileSync("content/w1/c/boss/solution.py", "utf8");

test("a fresh player tests out of the village from the sleeping ruins", async ({ page }) => {
  await page.goto("/#/");
  const places = page.getByRole("navigation", { name: "Places" });
  await places.getByRole("link", { name: "The ruins: The Lost Satchel" }).click();

  const offer = page.getByRole("dialog", { name: "Already know this world?" });
  await expect(offer).toBeVisible();
  await expect(offer.getByText(/marks every lesson of this world as done/)).toBeVisible();
  await offer.getByRole("link", { name: "Challenge the boss now" }).click();

  await expect(page.getByRole("heading", { name: "The Lost Satchel", level: 1 })).toBeVisible();
  await expect(page.getByText(/winning this fight marks every lesson/)).toBeVisible();

  const editor = page.locator(".cm-content").last();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(SOLUTION);
  await page
    .getByRole("button", { name: /^Check/ })
    .last()
    .click();

  const defeat = page.getByRole("dialog", { name: "The Lost Satchel is beaten" });
  await expect(defeat).toBeVisible({ timeout: 90_000 });
  await defeat.getByRole("link", { name: "Back to the village" }).click();

  const cleared = page.getByRole("dialog", { name: "World cleared" });
  await expect(cleared).toBeVisible();
  await cleared.getByRole("button", { name: "Back to the village" }).click();
  await expect(cleared).toBeHidden();

  // the forest road opens, and World 1 counts as done
  await expect(places.getByRole("link", { name: "Ranger's cabin" })).toHaveAttribute("href", "#/school/w2");
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("code-village/progress") ?? "{}") as Record<string, unknown>,
  );
  const lessons = saved.lessons as Record<string, unknown>;
  const bosses = Object.values(
    saved.bosses as Record<string, { wonAt: string | null; hardWonAt: string | null }>,
  );
  expect(Object.keys(lessons)).toHaveLength(12);
  expect((saved.worldsSkipped as Record<string, string>).w1).toBeTruthy();
  expect(bosses).toHaveLength(3);
  expect(bosses.every((b) => b.wonAt && b.hardWonAt === null)).toBe(true);
});
