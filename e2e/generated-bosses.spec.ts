import { expect, test } from "./fixtures";
import { code, chosen, openRoads } from "./generatedItems";
import { openWith } from "./helpers";

// For every chosen boss: with its region's lessons passed and the earlier worlds open, the model solution beats it,
// and then hard mode.

for (const boss of chosen().bosses) {
  test(`boss ${boss.id}`, async ({ page }) => {
    test.setTimeout(300_000);
    await openWith(page, `/#/boss/${boss.id}`, openRoads(boss.lessons, boss.id));
    const solution = code(boss.solution);

    const enter = async (): Promise<void> => {
      const editor = page.locator(".cm-content").last();
      await editor.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Delete");
      await page.keyboard.insertText(solution);
      await page
        .getByRole("button", { name: /^Check/ })
        .last()
        .click();
    };

    await enter();
    await expect(page.getByRole("dialog", { name: /is beaten/ })).toBeVisible({ timeout: 120_000 });

    // the win is saved, so a fresh load shows hard mode
    await page.reload();
    await page.getByRole("button", { name: "Hard mode" }).click();
    await enter();
    await expect(page.getByText(/Hard mode beaten!/)).toBeVisible({ timeout: 120_000 });
  });
}
