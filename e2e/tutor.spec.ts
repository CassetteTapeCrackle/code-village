import { expect, test } from "./fixtures";
import { showTask } from "./helpers";

const REPLY =
  'data: {"text":"What did you "}\n\ndata: {"text":"expect to happen?"}\n\ndata: {"done":true}\n\n';

test("ask the teacher shows the streamed reply", async ({ page }) => {
  await page.route("**/api/tutor", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body: REPLY }),
  );
  await page.goto("/#/lesson/values");
  await page.evaluate(() =>
    localStorage.setItem(
      "code-village/account",
      JSON.stringify({ nickname: "Ada", token: "test-token", revision: 0 }),
    ),
  );
  await page.reload();
  await showTask(page, "Price for a few");
  const task = page.getByRole("region", { name: "Price for a few" });
  await task.getByRole("button", { name: "Ask the teacher" }).click();
  await task.getByLabel("Your question").fill("Why is my total wrong?");
  await task.getByRole("button", { name: "Send" }).click();
  await expect(task.getByText("What did you expect to happen?")).toBeVisible();
});

test("copy for my agent puts the task packet on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/lesson/values");
  await showTask(page, "Price for a few");
  const task = page.getByRole("region", { name: "Price for a few" });
  await task.getByRole("button", { name: "Copy for my agent" }).click();
  await expect(task.getByText("Copied. Paste it into your agent.")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Price for a few");
  expect(text).toContain("village teacher");
});
