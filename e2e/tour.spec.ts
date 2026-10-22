import { expect, test } from "@playwright/test";
import { openWith, typeCode } from "./helpers";

test("a fresh player is greeted, walks, opens the school and passes the tour task", async ({ page }) => {
  await page.goto("/");
  const card = page.getByRole("dialog", { name: "Ms. Juniper" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Welcome to Code Village");
  await card.getByRole("button", { name: "Next" }).click();
  await expect(card).toContainText("Click any patch of grass");

  // click anywhere: a patch of grass near the square
  const world = page.locator(".world");
  await expect(world).toHaveAttribute("data-mochi", "66,46");
  await page.waitForFunction(() => (document.querySelector(".viewport")?.scrollTop ?? 0) > 0);
  const box = await world.boundingBox();
  if (!box) throw new Error("the map has no box");
  const tile = box.width / 96; // the map is 96 tiles wide
  await page.mouse.click(box.x + 62.5 * tile, box.y + 47.5 * tile);
  await expect(card).toContainText("Now click a building");

  // a building: the school
  await page.locator('a.place[href="#/school"]').click();
  await expect(page.getByRole("heading", { name: "School", exact: true })).toBeVisible({ timeout: 8_000 });
  await expect(card).toContainText("Every lesson lives on this board");

  // the tour's first lesson
  await page.getByRole("link", { name: /Start here/ }).click();
  await expect(page.getByRole("heading", { name: "Hello, Code Village" })).toBeVisible();
  await expect(card).toContainText("Press Run");

  const task = page.getByRole("region", { name: "Say hello" });
  await typeCode(page, "Say hello", 'name = input()\nprint(f"Hello, {name}! Welcome to Code Village.")\n');
  await task.getByRole("textbox", { name: /Input lines for Run/ }).fill("Sam");
  await task.getByRole("button", { name: "Run" }).click();
  await expect(task.locator("pre.out")).toContainText("Hello, Sam! Welcome to Code Village.", {
    timeout: 60_000,
  });
  await expect(card).toContainText("Run tries your code");
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("Passed. +15 XP")).toBeVisible({ timeout: 60_000 });
  await expect(card).toContainText("Stuck? Ask the teacher");

  // the rest is optional
  await card.getByRole("button", { name: "Skip the tour" }).click();
  await expect(card).toHaveCount(0);

  // skipping lasts on this device, and the lesson progress is untouched
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Ms. Juniper" })).toHaveCount(0);
  await expect(page.getByText("Level 1 · 35 / 100 XP")).toBeVisible();
});

test("a player with progress sees no tour", async ({ page }) => {
  const passed = {
    version: 1,
    xp: 15,
    tasks: {
      "vars-1": { passedAt: "2026-10-01", hintsUsed: 0, checks: 1, xpEarned: 15 },
    },
    lessons: {},
    plants: {},
    drafts: {},
    reviewLast: {},
    bosses: {},
  };
  await openWith(page, "/", passed);
  await expect(page.getByRole("dialog", { name: "Ms. Juniper" })).toHaveCount(0);
});
