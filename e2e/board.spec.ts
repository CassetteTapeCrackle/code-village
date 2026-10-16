import { expect, test } from "@playwright/test";
import { showTask, typeCode } from "./helpers";

const adaRow = {
  nickname: "Ada",
  xp: 135,
  level: 2,
  lessons: 1,
  bossesWon: 1,
  hardWins: 1,
  furthestWorld: "w1",
  lastActive: "2026-10-14",
};

test("the board opens from the map, and a nickname opens its card", async ({ page }) => {
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/leaderboard")) {
      return route.fulfill({ json: { period: url.includes("week") ? "week" : "all", rows: [adaRow] } });
    }
    if (url.endsWith("/api/news")) {
      return route.fulfill({
        json: { items: [{ nickname: "Ada", kind: "lesson_passed", id: "values", day: "2026-10-10" }] },
      });
    }
    if (url.includes("/api/players/")) {
      return route.fulfill({
        json: { ...adaRow, joined: "2026-10-01T09:00:00.000Z", trophies: ["Quarry Key"], recent: [] },
      });
    }
    return route.fulfill({ json: { error: "No such API route." }, status: 404 });
  });
  await page.goto("/#/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Board" }).click();
  await expect(page.getByRole("heading", { name: "Village board", level: 1 })).toBeVisible();
  await expect(page.getByText(/Ada finished Values, types and variables/)).toBeVisible();
  await page.getByRole("button", { name: "Ada" }).click();
  const card = page.getByRole("dialog", { name: "Ada" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Quarry Key")).toBeVisible();
});

test("the unregistered game still plays a task", async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ json: { error: "No such API route." }, status: 404 }),
  );
  await page.goto("/#/lesson/lists");
  await showTask(page, "The last one");
  const task = page.getByRole("region", { name: "The last one" });
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("0 of 2 tests passed")).toBeVisible({ timeout: 60_000 });
  await showTask(page, "The last one");
  await typeCode(page, "The last one", "def last_item(items):\n    return items[-1]\n");
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("Passed. +15 XP")).toBeVisible({ timeout: 60_000 });
});
