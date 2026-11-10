import { expect, test } from "./fixtures";
import { showTask, typeCode } from "./helpers";

test("pass a task, earn XP, and keep it after a reload", async ({ page }) => {
  await page.goto("/#/lesson/lists");
  await showTask(page, "The last one");
  const task = page.getByRole("region", { name: "The last one" });
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("0 of 2 tests passed")).toBeVisible({ timeout: 60_000 });
  await showTask(page, "The last one");
  await typeCode(page, "The last one", "def last_item(items):\n    return items[-1]\n");
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText("Passed. +15 XP")).toBeVisible();
  await page.reload();
  // after a reload the slate opens on the first unfinished task, so bring the passed one back
  await showTask(page, "The last one");
  await expect(page.getByRole("region", { name: "The last one" }).getByText("Passed. +15 XP")).toBeVisible();
  await expect(page.getByText("Level 1 · 15 / 100 XP")).toBeVisible();
});

test("an infinite loop is stopped after 5 s and Python still works afterwards", async ({ page }) => {
  await page.goto("/#/lesson/lists");
  await showTask(page, "Add it twice");
  await typeCode(page, "Add it twice", "while True:\n    pass\n");
  await showTask(page, "Add it twice");
  const task = page.getByRole("region", { name: "Add it twice" });
  await task.getByRole("button", { name: "Run" }).click();
  await expect(task.getByText(/Still running after 5 s/)).toBeVisible({ timeout: 70_000 });
  await showTask(page, "Add it twice");
  await typeCode(page, "Add it twice", "print('alive')\n");
  await task.getByRole("button", { name: "Run" }).click();
  await expect(task.getByText("alive", { exact: true })).toBeVisible({ timeout: 60_000 });
});

test("Run feeds input() from the input box, like a terminal", async ({ page }) => {
  await page.goto("/#/lesson/lists");
  await showTask(page, "Add it twice");
  await typeCode(page, "Add it twice", "name = input('Name: ')\nprint('Hi', name)\n");
  await showTask(page, "Add it twice");
  const task = page.getByRole("region", { name: "Add it twice" });
  await task.getByRole("textbox", { name: /Input lines for Run/ }).fill("Sam");
  await task.getByRole("button", { name: "Run" }).click();
  await expect(task.locator("pre.out")).toHaveText("Name: Sam\nHi Sam\n", { timeout: 60_000 });
});

test("a syntax error is reported on its line", async ({ page }) => {
  await page.goto("/#/lesson/lists");
  await showTask(page, "The last one");
  await typeCode(page, "The last one", "def last_item(items)\n    return items[-1]\n");
  await showTask(page, "The last one");
  const task = page.getByRole("region", { name: "The last one" });
  await task.getByRole("button", { name: "Check" }).click();
  await expect(task.getByText(/SyntaxError on line 1/)).toBeVisible({ timeout: 60_000 });
});

test("notebook paragraphs start on the ruling and stay on it", async ({ page }) => {
  for (const lesson of ["lists", "input-output", "recursion"]) {
    await page.goto(`/#/lesson/${lesson}`);
    await expect(page.locator(".notebook > .text").first()).toBeVisible();
    // Measure the resting layout: the shipped font is in, the lazy editors have replaced their
    // stand-ins, and the padding pass after those changes has landed.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.locator(".notebook .stand-in")).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator(".notebook")).toHaveAttribute("data-ruling", "aligned", {
      timeout: 60_000,
    });
    // top: offset from the first rule; height: inline code must not stretch a line past 28 px
    const off = await page.locator(".notebook").evaluate((nb) => {
      const top = nb.getBoundingClientRect().top + parseFloat(getComputedStyle(nb).paddingTop);
      return [...nb.querySelectorAll<HTMLElement>(":scope > .text")].flatMap((t) => {
        const r = t.getBoundingClientRect();
        const pad = parseFloat(t.style.paddingTop || "0");
        return [Math.round(r.top + pad - top) % 28, Math.round(r.height - pad) % 28];
      });
    });
    expect(
      off.every((o) => o === 0),
      `${lesson}: ${off.join(",")}`,
    ).toBe(true);
  }
});

test("library recap pages keep every line on the ruling", async ({ page }) => {
  await page.goto("/#/library");
  await page.locator("button.fold").first().click();
  await expect(page.locator(".page").first()).toBeVisible();
  const off = await page.locator(".page").evaluateAll((pages) =>
    pages.flatMap((pg) => {
      const top = pg.getBoundingClientRect().top + parseFloat(getComputedStyle(pg).paddingTop);
      return [...pg.querySelectorAll("h3, li")].map(
        (e) => Math.round(e.getBoundingClientRect().top - top) % 28,
      );
    }),
  );
  expect(
    off.every((o) => o === 0),
    off.join(","),
  ).toBe(true);
});
