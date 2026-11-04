import { expect, test, type Page } from "@playwright/test";
import { code, chosen, lessons } from "./generatedItems";
import { finishTour, showTask, typeCode } from "./helpers";

// For every chosen task: the starter fails, the first wrong/ answer fails, the mutant that only the hidden cases kill
// shows "We also tried", and the model solution passes. One page per lesson. Built from the bundle's content files,
// so a new world gets all of it from content alone (spec 16).
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const RESULT = /tests passed|Error/;

for (const [lesson, tasks] of lessons(chosen().tasks)) {
  test.describe.serial(`lesson ${lesson}`, () => {
    let page: Page;
    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage({ baseURL: BASE });
      await finishTour(page);
      await page.goto(`/#/lesson/${lesson}`);
    });
    test.afterAll(async () => page.close());

    for (const task of tasks) {
      test(task.id, async () => {
        test.setTimeout(240_000);
        const region = page.getByRole("region", { name: task.title });
        const check = async (): Promise<void> => {
          await region.getByRole("button", { name: "Check" }).click();
          await expect(region.locator(".results")).toContainText(RESULT, { timeout: 90_000 });
        };
        await showTask(page, task.title);

        await check(); // the starter as it comes
        await expect(region.getByText(/Passed\. \+\d+ XP/)).toHaveCount(0);

        if (task.wrong) {
          await typeCode(page, task.title, code(task.wrong));
          await check();
          await expect(region.locator(".results")).toContainText(/✗|Error/);
          await expect(region.getByText(/Passed\. \+\d+ XP/)).toHaveCount(0);
        }
        if (task.hiddenMutant) {
          await typeCode(page, task.title, task.hiddenMutant);
          await check();
          await expect(region.locator(".hidden-case")).toContainText("We also tried");
        }

        await typeCode(page, task.title, code(task.solution));
        await region.getByRole("button", { name: "Check" }).click();
        await expect(region.getByText(/Passed\. \+\d+ XP/)).toBeVisible({ timeout: 90_000 });
      });
    }
  });
}
