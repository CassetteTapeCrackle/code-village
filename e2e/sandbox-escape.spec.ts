import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const BUILT = "http://localhost:4173";

async function sandboxRun(page: Page, code: string): Promise<void> {
  await page.getByLabel("Sandbox code").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(code);
  await page.getByRole("button", { name: "Run" }).click();
}

// The service worker serves the app's files from Cache Storage, which the Python worker shares (same origin).
// If learner code can write there, pasted code replaces the app's own script and the next load runs it on
// the real page, where the account token lives.
test("learner code cannot replace the app's cached script", async ({ page }) => {
  await page.goto(`${BUILT}/`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const bundle = await page.evaluate(
    () => new URL(document.querySelector<HTMLScriptElement>('script[type="module"]')!.src).pathname,
  );
  await page.goto(`${BUILT}/#/sandbox`);
  await sandboxRun(
    page,
    [
      "import asyncio, js",
      "from pyodide.ffi import to_js",
      "storage = js.caches",
      "init = to_js({'headers': {'content-type': 'text/javascript'}}, dict_converter=js.Object.fromEntries)",
      "async def poison():",
      "    for name in await storage.keys():",
      "        cache = await storage.open(name)",
      `        await cache.put('${bundle}', js.Response.new('window.__pwned = 1', init))`,
      "asyncio.ensure_future(poison())",
      "print('attack sent')",
      "",
    ].join("\n"),
  );
  await expect(page.getByText(/attack sent|AttributeError/)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000); // the writes are async: give a working attack time to land
  await page.reload();
  expect(await page.evaluate(() => (window as { __pwned?: number }).__pwned)).toBeUndefined();
});

test("learner code reaches no storage and cannot start a worker of its own", async ({ page }) => {
  await page.goto(`${BUILT}/#/sandbox`);
  await sandboxRun(
    page,
    [
      "import js",
      "names = ['caches', 'indexedDB', 'Worker']",
      "print([hasattr(js, n) for n in names] + [hasattr(js.WorkerGlobalScope.prototype, n) for n in names[:2]])",
      "",
    ].join("\n"),
  );
  await expect(page.getByText("[False, False, False, False, False]", { exact: true })).toBeVisible({
    timeout: 60_000,
  });
});
