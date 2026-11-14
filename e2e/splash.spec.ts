import { expect, test } from "@playwright/test";

// Every Playwright test runs in a fresh browser context, so each one starts as a brand new tab.
const SEEN = "code-village/splash-seen";

test("a new tab shows the splash, then opens onto the village", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  expect(await page.evaluate((key) => sessionStorage.getItem(key), SEEN)).toBe("1");
});

test("a reload never shows the splash", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => document.documentElement.classList.contains("splash-seen"))).toBe(true);
  await expect(page.locator("#splash")).toBeHidden();
});

test("another new tab shows it again", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  const tab = await context.newPage();
  await tab.goto("/", { waitUntil: "commit" });
  await expect(tab.locator("#splash")).toBeVisible();
});

test("a new tab on a lesson link still opens the doors", async ({ page }) => {
  await page.goto("/#/lesson/lists");
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
});

test("the splash gives up after 10 s when the app never starts", async ({ page }) => {
  await page.route("**/src/main.ts", (route) => route.abort());
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("#splash")).toBeHidden({ timeout: 12_000 });
});
