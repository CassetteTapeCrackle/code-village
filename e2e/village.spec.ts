import { expect, test } from "@playwright/test";
import { openWith, showTask, typeCode } from "./helpers";

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a place in the list opens at once, without the walk", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Garden" }).click();
    await expect(page).toHaveURL(/#\/garden$/);
    await expect(page.getByRole("heading", { name: "Garden" })).toBeVisible();
  });
});

test("clicking a building on the map sends Mochi there, then opens it", async ({ page }) => {
  await page.goto("/");
  await page.locator('a.place[href="#/school"]').click();
  await expect(page.getByRole("heading", { name: "School", exact: true })).toBeVisible({ timeout: 8_000 });
});

// Counts the map's paints (each paint blits the static layer with drawImage), the way measure.cjs does.
async function trackPaints(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __paints: number };
    w.__paints = 0;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (
      this: CanvasRenderingContext2D,
      ...args: unknown[]
    ) {
      w.__paints += 1;
      return (draw as (...a: unknown[]) => void).apply(this, args);
    } as typeof CanvasRenderingContext2D.prototype.drawImage;
  });
}
const paints = (page: import("@playwright/test").Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __paints: number }).__paints);

test("light mode paints once behind a board and stops until it closes", async ({ page }) => {
  await trackPaints(page);
  await page.goto("/?light=1#/school");
  await expect(page.getByRole("heading", { name: "School", exact: true })).toBeVisible();
  await page.waitForTimeout(2000); // the opening scroll and its repaints settle
  const covered = await paints(page);
  await page.waitForTimeout(1000);
  expect(await paints(page)).toBe(covered); // the loop is stopped behind the board
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/#\/school$/);
  await page.waitForTimeout(1000);
  expect(await paints(page)).toBeGreaterThan(covered + 5); // the loop is painting again
});

test("passing a lesson's last task plants its seed, once", async ({ page }) => {
  const twoDone = { passedAt: "2026-10-01", hintsUsed: 0, checks: 1, xpEarned: 15 };
  await openWith(page, "/#/lesson/lists", {
    version: 1,
    xp: 30,
    tasks: { "lists-last-item": twoDone, "lists-add-twice": twoDone },
    lessons: {},
    plants: {},
    drafts: {},
  });
  await showTask(page, "Leave the original alone");
  await typeCode(
    page,
    "Leave the original alone",
    "def copy_and_add(items, x):\n    new = items.copy()\n    new.append(x)\n    return new\n",
  );
  await page
    .getByRole("region", { name: "Leave the original alone" })
    .getByRole("button", { name: "Check" })
    .click();
  await expect(page.getByText("A lists seed was planted in the garden.")).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
  await expect(page.getByText("A lists seed was planted in the garden.")).toHaveCount(0);
});
