import { expect, test, type Locator, type Page } from "@playwright/test";
import { code, chosen, lessons } from "./generatedItems";
import { finishTour, showTask, typeCode } from "./helpers";

// For every chosen task: the starter fails, the first wrong/ answer fails, the mutant that only the hidden cases kill
// shows "We also tried", and the model solution passes. One page per lesson. Built from the bundle's content files,
// so a new world gets all of it from content alone (spec 16).
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const RESULT = /tests passed|Error/;

// Sharding splits files unless tests may run in parallel; the serial describes below stay whole (one lesson each)
test.describe.configure({ mode: "parallel" });

// Click Check and wait until that run is over. A MutationObserver sees the button turn busy even when the run is
// quick, and the old result stays on the page until the new one replaces it, so the text alone cannot say it.
async function runCheck(region: Locator): Promise<void> {
  const button = region.getByRole("button", { name: "Check" });
  await button.evaluate((el) => {
    const mark = el as HTMLButtonElement & { busySeen?: boolean };
    mark.busySeen = false;
    new MutationObserver(() => {
      if (mark.disabled) mark.busySeen = true;
    }).observe(mark, { attributes: true, attributeFilter: ["disabled"] });
  });
  await button.click();
  await expect
    .poll(
      () =>
        button.evaluate(
          (el) =>
            Boolean((el as HTMLButtonElement & { busySeen?: boolean }).busySeen) &&
            !(el as HTMLButtonElement).disabled,
        ),
      {
        timeout: 90_000,
      },
    )
    .toBe(true);
  await expect(region.locator(".results")).toContainText(RESULT);
}

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
        const notPassed = region.getByText(/Passed\. \+\d+ XP/);
        await showTask(page, task.title);

        await runCheck(region); // the starter as it comes
        await expect(notPassed).toHaveCount(0);
        await expect(region.locator(".results")).toContainText(/✗|Error/);

        if (task.wrong) {
          await typeCode(page, task.title, code(task.wrong));
          await runCheck(region);
          await expect(region.locator(".results")).toContainText(/✗|Error/);
          await expect(notPassed).toHaveCount(0);
        }
        if (task.hiddenMutant) {
          await typeCode(page, task.title, task.hiddenMutant);
          await runCheck(region);
          await expect(region.locator(".hidden-case")).toContainText("We also tried");
        }

        await typeCode(page, task.title, code(task.solution));
        await runCheck(region);
        await expect(notPassed).toBeVisible();
      });
    }
  });
}
