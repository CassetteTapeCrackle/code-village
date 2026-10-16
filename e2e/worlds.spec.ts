import { expect, test } from "@playwright/test";
import { openWith } from "./helpers";

const D = "2026-10-12";
const LESSONS = [
  "values",
  "input-output",
  "conditions",
  "loops",
  "strings",
  "lists",
  "grids",
  "dicts",
  "comprehensions",
  "functions",
  "errors",
  "recursion",
];
const save = (lantern: boolean): object => ({
  version: 1,
  xp: 0,
  tasks: {},
  lessons: Object.fromEntries(LESSONS.map((id) => [id, { passedAt: D }])),
  plants: {},
  drafts: {},
  reviewLast: {},
  bosses: lantern ? { "lost-satchel": { stagesPassed: [], wonAt: D, hardWonAt: null, hardChecks: 0 } } : {},
});

test("beating the Lost Satchel opens the forest road, once", async ({ page }) => {
  await openWith(page, "/#/", save(true));
  const banner = page.getByRole("dialog", { name: "The Forest" });
  await expect(banner).toBeVisible();
  await expect(banner.getByText("The Ruin Lantern lights the forest path.")).toBeVisible();
  await banner.getByRole("button", { name: "Show me" }).click();
  await expect(banner).toBeHidden();
  const cabin = page
    .getByRole("navigation", { name: "Places" })
    .getByRole("link", { name: "Ranger's cabin" });
  await expect(cabin).toHaveAttribute("href", "#/school/w2");
  await page.goto("/#/school/w2");
  await expect(page.getByRole("heading", { name: "Ranger's cabin", level: 1 })).toBeVisible();
  await expect(page.getByText("Ranger Noa")).toBeVisible();
  await expect(page.getByRole("link", { name: /Classes and objects/ }).first()).toBeVisible();
  await page.goto("/#/");
  await expect(page.getByRole("dialog", { name: "The Forest" })).toBeHidden();
});

test("without the Ruin Lantern the forest stays blocked", async ({ page }) => {
  await openWith(page, "/#/school/w2", save(false));
  await expect(page.getByRole("heading", { name: "The road is still blocked" })).toBeVisible();
  await page.goto("/#/");
  await expect(
    page.getByRole("navigation", { name: "Places" }).getByRole("link", { name: "Ranger's cabin" }),
  ).toHaveCount(0);
});

for (const width of [1280, 390]) {
  test(`a villager speaks in a bubble over the map (${width} px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    // the villager list is the keyboard way: hidden until focused
    const ines = page.getByRole("button", { name: /^Ines, / });
    await ines.focus();
    await ines.press("Enter");
    await expect(page.locator(".talk-bubble")).toContainText("Ines");
  });
}

test("on a phone the map opens on the square, and tapping a villager shows their bubble", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" }); // villagers stand still at their starting spots
  await page.goto("/");
  const view = page.locator(".viewport");
  const SCALE = 16; // 8 px tiles drawn at 2x on phones
  await expect
    .poll(() =>
      view.evaluate((v, s) => Math.abs(v.scrollLeft + v.clientWidth / 2 - 28.5 * s - 40 * s), SCALE),
    )
    .toBeLessThan(SCALE * 2); // the square's centre, village tile 28, is in the middle
  await view.evaluate((v) => (v.scrollLeft = 60 * 16 - 150)); // bring Ines (world tile 60, 46) into view
  const box = (await page.locator(".world").boundingBox())!;
  await page.mouse.click(box.x + 60.5 * SCALE, box.y + 46.5 * SCALE);
  await expect(page.locator(".talk-bubble")).toContainText("Ines");
});

test("going straight from a beaten boss to another boss does not carry the defeat scene over", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  await openWith(page, "/#/boss/guessing-stone", save(false));
  const editor = page.locator(".cm-content").last();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(readFileSync("content/w1/a/boss/solution.py", "utf8"));
  await page
    .getByRole("button", { name: /^Check/ })
    .last()
    .click();
  await expect(page.getByRole("dialog", { name: /is beaten/ })).toBeVisible({ timeout: 90_000 });
  await page.evaluate(() => (location.hash = "#/boss/gradebook"));
  await expect(page.getByRole("heading", { name: "The Gradebook", level: 1 })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
