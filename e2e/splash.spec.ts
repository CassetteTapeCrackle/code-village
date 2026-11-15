import { expect, test } from "@playwright/test";

// Every Playwright test runs in a fresh browser context, so each one starts as a brand new tab.
const SEEN = "code-village/splash-seen";

test("a new tab shows the splash, then opens onto the village", async ({ page }) => {
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  expect(await page.evaluate((key) => sessionStorage.getItem(key), SEEN)).toBe("1");
});

test("a reload never shows the splash, not even for one frame", async ({ page }) => {
  // Before any page script, check every frame until load whether the splash was on screen.
  await page.addInitScript(() => {
    const probe = window as unknown as { splashPainted: boolean };
    probe.splashPainted = false;
    const check = (): void => {
      const splash = document.getElementById("splash");
      if (splash && getComputedStyle(splash).display !== "none") probe.splashPainted = true;
      if (document.readyState !== "complete") requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
  const painted = (): Promise<boolean> =>
    page.evaluate(() => (window as unknown as { splashPainted: boolean }).splashPainted);
  await page.goto("/");
  expect(await painted()).toBe(true); // the probe sees a new tab's splash
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  expect(await painted()).toBe(false);
  expect(await page.evaluate(() => document.documentElement.classList.contains("splash-seen"))).toBe(true);
});

test("another new tab shows it again", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
  const tab = await context.newPage();
  await tab.goto("/", { waitUntil: "commit" });
  await expect(tab.locator("#splash")).toBeVisible();
});

test("a new tab on a lesson link shows the splash, then opens the doors", async ({ page }) => {
  await page.goto("/#/lesson/lists", { waitUntil: "commit" });
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("#splash")).toHaveCount(0, { timeout: 10_000 });
});

test("the splash gives up at 10 s when the app never starts", async ({ page }) => {
  // Block every script but the gate, whatever the app's entry is called on this server.
  let blocked = false;
  await page.route("**/*", (route) => {
    const request = route.request();
    if (request.resourceType() !== "script" || request.url().endsWith("/splash-gate.js")) {
      return route.continue();
    }
    blocked = true;
    return route.abort();
  });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForTimeout(9_000);
  expect(blocked).toBe(true);
  await expect(page.locator("#app")).toBeEmpty();
  await expect(page.locator("#splash")).toBeVisible();
  await expect(page.locator("#splash")).toBeHidden({ timeout: 3_000 });
});
