import { expect, test } from "./fixtures";
import { openWith } from "./helpers";

// The Signboard: every place opens as a board over the village, which stays on screen under it.

test("a board opens beside its building, and Escape brings the map back", async ({ page }) => {
  await page.goto("/#/library");
  const board = page.getByRole("region", { name: "Library" });
  await expect(board).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Places" })).toBeAttached(); // the village is still there, under the board
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/#\/$/);
  await expect(board).toHaveCount(0);
});

test("a click on the dimmed village closes the board", async ({ page }) => {
  await page.goto("/#/house");
  await expect(page.getByRole("region", { name: "Your house" })).toBeVisible();
  const box = await page.locator(".dim").boundingBox();
  if (!box) throw new Error("no dimmed village");
  // the board docks on one side, so click near the other edge of the stage
  const board = await page.locator("section.board").boundingBox();
  const x = board && board.x + board.width / 2 > box.x + box.width / 2 ? box.x + 20 : box.x + box.width - 20;
  await page.mouse.click(x, box.y + box.height / 2);
  await expect(page).toHaveURL(/#\/$/);
});

test("number keys open the places on the plank", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("3");
  await expect(page.getByRole("region", { name: "Garden" })).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.getByRole("region", { name: "School" })).toBeVisible();
});

test("Show me on a built decoration points the village at it, with a way back", async ({ page }) => {
  await openWith(page, "/#/house", {
    version: 1,
    xp: 120,
    tasks: {},
    lessons: {},
    plants: {},
    drafts: {},
    reviewLast: {},
    bosses: {},
  });
  await page.getByRole("button", { name: /^Level 2:/ }).click();
  await page.getByRole("button", { name: "Show me" }).first().click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".showbar")).toContainText("Lanterns along the main street");
  await page.getByRole("link", { name: "Back to your house" }).click();
  await expect(page.getByRole("region", { name: "Your house" })).toBeVisible();
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a place's board is a sheet, and its building stays in view above it", async ({ page }) => {
    await page.goto("/#/garden");
    const sheet = await page.locator("section.board").boundingBox();
    expect(sheet && sheet.y).toBeGreaterThan(844 * 0.3);
    const plate = await page.locator('a.place[href="#/garden"]').boundingBox();
    expect(plate && sheet && plate.y + plate.height / 2).toBeLessThan(sheet!.y);
  });

  test("the places sit in a plank at the thumb", async ({ page }) => {
    await page.goto("/");
    const plank = await page.getByRole("navigation", { name: "Main" }).boundingBox();
    expect(plank && plank.y + plank.height).toBeGreaterThan(844 - 4);
  });
});
