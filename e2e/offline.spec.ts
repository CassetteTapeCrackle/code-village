import { expect, test } from "@playwright/test";
import { showTask, typeCode } from "./helpers";

const BUILT = "http://localhost:4173";

test("after one visit and one run, the app and Python work with the network off", async ({
  page,
  context,
}) => {
  await page.goto(`${BUILT}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const precached = await page.evaluate(
    async () => (await (await fetch("precache.json")).json()) as string[],
  );
  expect(precached.some((f) => f.startsWith("pyodide/"))).toBe(false); // Pyodide waits for a first run
  const run = async (): Promise<void> => {
    await showTask(page, "The last one");
    await typeCode(page, "The last one", 'print("offline ok")\n');
    await page.getByRole("region", { name: "The last one" }).getByRole("button", { name: "Run" }).click();
    await expect(page.getByText("offline ok", { exact: true })).toBeVisible({ timeout: 60_000 });
  };
  await page.goto(`${BUILT}/#/lesson/lists`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
  await run(); // this first run is what puts Pyodide in the cache
  await expect
    .poll(() => page.evaluate(async () => Boolean(await caches.match("pyodide/pyodide.asm.wasm"))), {
      timeout: 60_000,
    })
    .toBe(true);
  await context.setOffline(true);
  await page.goto(`${BUILT}/#/lesson/lists`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
  await run();
});

test("NumPy and pandas load only when imported, then keep working offline", async ({ page, context }) => {
  test.setTimeout(240_000);
  await page.goto(`${BUILT}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const precached = await page.evaluate(
    async () => (await (await fetch("precache.json")).json()) as string[],
  );
  expect(precached.filter((f) => f.endsWith(".whl"))).toEqual([]); // World 1 visitors download none of it
  const sandboxRun = async (code: string): Promise<void> => {
    await page.getByLabel("Sandbox code").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(code);
    await page.getByRole("button", { name: "Run" }).click();
  };
  const code =
    'import numpy as np\nimport pandas as pd\nprint(float(np.mean([1, 4])), len(pd.DataFrame({"a": [1, 2]})))\n';
  await page.goto(`${BUILT}/#/sandbox`);
  await sandboxRun(code);
  await expect(page.getByText("2.5 2", { exact: true })).toBeVisible({ timeout: 120_000 });
  await context.setOffline(true);
  await page.reload();
  await sandboxRun(code);
  await expect(page.getByText("2.5 2", { exact: true })).toBeVisible({ timeout: 120_000 });
});
