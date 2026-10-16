import { expect, test } from "@playwright/test";
import { openWith, typeCode } from "./helpers";

// Every Collections lesson passed, so the region's boss (the Gradebook) is awake.
const done = { passedAt: "2026-10-01" };
const listsPassed = {
  version: 1,
  xp: 0,
  tasks: {},
  plants: {},
  drafts: {},
  lessons: { strings: done, lists: done, grids: done, dicts: done, comprehensions: done },
};

test("beat a boss stage and keep it after a reload", async ({ page }) => {
  await openWith(page, "/#/boss/gradebook", listsPassed);
  const parseOnly =
    'def parse_line(line):\n    name, _, rest = line.partition(":")\n    return name.strip(), [int(m) for m in rest.split(",") if m.strip()]\n';
  await typeCode(page, "The Gradebook", parseOnly);
  await page.getByRole("region", { name: "The Gradebook" }).getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("70 / 100")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Level 1 · 40 / 100 XP")).toBeVisible();
  await page.reload();
  await expect(page.getByText("70 / 100")).toBeVisible();
});

test("run the daily review and watch the plant grow", async ({ page }) => {
  await openWith(page, "/#/garden", { ...listsPassed, plants: { lists: { stage: 0, due: "2026-10-02" } } });
  await expect(page.getByText(/wilting: it was due/)).toBeVisible();
  await page.getByRole("button", { name: /Start today's review/ }).click();
  await typeCode(page, "The last one", "def last_item(items):\n    return items[-1]\n");
  await page.getByRole("region", { name: "The last one" }).getByRole("button", { name: /Check/ }).click();
  await expect(page.getByText(/Well remembered/)).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByText(/A sprout\. Next watering on/)).toBeVisible();
  await expect(page.getByText("Level 1 · 5 / 100 XP")).toBeVisible();
});

test("beating a boss plays the defeat scene", async ({ page }) => {
  await openWith(page, "/#/boss/gradebook", listsPassed);
  const solution = [
    "def parse_line(line):",
    '    name, _, rest = line.partition(":")',
    '    return name.strip(), [int(m) for m in rest.split(",") if m.strip()]',
    "",
    "def average(marks):",
    "    if not marks:",
    "        return 0.0",
    "    return round(sum(marks) / len(marks), 2)",
    "",
    "def ranking(lines):",
    "    pairs = [(n, average(m)) for n, m in (parse_line(l) for l in lines if l.strip())]",
    "    return sorted(pairs, key=lambda p: (-p[1], p[0]))",
    "",
  ].join("\n");
  await typeCode(page, "The Gradebook", solution);
  await page.getByRole("region", { name: "The Gradebook" }).getByRole("button", { name: "Check" }).click();
  const scene = page.getByRole("dialog", { name: "The Gradebook is beaten" });
  await expect(scene).toBeVisible({ timeout: 60_000 });
  await expect(scene.getByText(/Brass Ledger/)).toBeVisible();
  await scene.getByRole("button", { name: "Stay here" }).click();
  await expect(scene).toBeHidden(); // regression: the scene used to reopen itself
  await expect(page.getByText("0 / 100")).toBeVisible();
});

test("a new level greets you in the village with what changed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("code-village/seen-level", "2"));
  await openWith(page, "/", { ...listsPassed, xp: 320 });
  const banner = page.getByRole("dialog", { name: "Level 3" });
  await expect(banner.getByText("A market stall in the square")).toBeVisible();
  await banner.getByRole("button", { name: "Show me" }).click();
  await expect(banner).toBeHidden();
  await expect(page.getByText(/New at level 3: A market stall in the square/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog", { name: "Level 3" })).toHaveCount(0);
});
