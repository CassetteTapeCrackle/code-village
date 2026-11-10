import type { Page } from "@playwright/test";

// e2e saves start after the first-visit tour: its card is a dialog and its tips cover the map, so a test
// that is not about the tour should never meet them. The tour's own spec navigates without this.
export const TOUR_FINISHED = {
  step: "goodbye",
  done: true,
  skipped: false,
  joined: false,
  recoverySaved: false,
  seenTips: ["garden", "library", "house", "sandbox", "board", "today"],
};

export async function finishTour(page: Page): Promise<void> {
  await page.addInitScript((state) => {
    localStorage.setItem("code-village/tour", JSON.stringify(state));
  }, TOUR_FINISHED);
}

export async function typeCode(page: Page, taskTitle: string, code: string): Promise<void> {
  const editor = page.getByLabel(`Your code for ${taskTitle}`);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
}

// Writes a save the way the app does, then loads the page fresh so the app reads it.
export async function openWith(page: Page, path: string, progress: object): Promise<void> {
  await finishTour(page);
  await page.goto("/");
  await page.evaluate((p) => localStorage.setItem("code-village/progress", JSON.stringify(p)), progress);
  await page.goto(path);
  await page.reload();
}

// Seeds a save before the app's own scripts run, for a first visit that must not be lost to a second load.
export async function openSeeded(
  page: Page,
  path: string,
  progress: object,
  seenLevel: number,
): Promise<void> {
  await page.addInitScript(
    ({ p, seen, tour }) => {
      if (sessionStorage.getItem("__seeded")) return;
      sessionStorage.setItem("__seeded", "1");
      localStorage.clear();
      localStorage.setItem("code-village/progress", JSON.stringify(p));
      localStorage.setItem("code-village/seen-level", String(seen));
      localStorage.setItem("code-village/tour", JSON.stringify(tour));
    },
    { p: progress, seen: seenLevel, tour: TOUR_FINISHED },
  );
  await page.goto(path);
}

// On wide screens a lesson shows one task on the slate; click its pin in the notebook to bring it up.
export async function showTask(page: Page, taskTitle: string): Promise<void> {
  const pin = page.getByRole("button", { name: `Open task: ${taskTitle}` });
  if (await pin.count()) await pin.click();
}
