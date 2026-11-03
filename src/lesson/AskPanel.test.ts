import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Lesson, Task } from "../content/types";
import { signIn, signOut } from "../store/account.svelte";
import type { Snapshot } from "../tutor/packet";
import AskPanel from "./AskPanel.svelte";

const lesson: Lesson = {
  id: "values",
  title: "Values and names",
  world: "w1",
  region: "a",
  order: 1,
  concepts: ["values"],
  remember: ["a name points at a value"],
  loot: { id: "values-loot", name: "Pocket lint" },
  blocks: [],
};

const task: Task = {
  id: "values-total-price",
  concept: "values",
  kind: "write",
  title: "Price for a few",
  prompt: "Write total_price.",
  starter: "def total_price(price, quantity):\n    pass\n",
  tests: "def test_hidden(): expect_equal(1, 2)",
  hints: ["Multiply the two parameters."],
  gotcha: false,
  variants: [],
  cases: [],
};

const snapshot: Snapshot = {
  taskId: task.id,
  code: "def total_price(price, quantity):\n    return 0\n",
  check: null,
  checks: 2,
  hints: 0,
};

function stubStream(...bodies: string[]): ReturnType<typeof vi.fn> {
  const sse = bodies.map((b) => `data: ${b}\n\n`).join("");
  const fetchMock = vi.fn(async () => new Response(sse, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function ask(text: string): Promise<void> {
  await fireEvent.click(screen.getByRole("button", { name: "Ask the teacher" }));
  await fireEvent.input(screen.getByLabelText("Your question"), { target: { value: text } });
  await fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
});

afterEach(() => {
  signOut();
  vi.unstubAllGlobals();
});

test("the privacy line shows until the first question, and the reply streams in", async () => {
  stubStream('{"text":"What did"}', '{"text":" you expect?"}', '{"done":true}');
  render(AskPanel, { lesson, task, snapshot });
  await fireEvent.click(screen.getByRole("button", { name: "Ask the teacher" }));
  expect(
    screen.getByText("Your question and code go to Cloudflare's model, which does not train on them."),
  ).toBeTruthy();
  await fireEvent.input(screen.getByLabelText("Your question"), {
    target: { value: "Why is my total wrong?" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await vi.waitFor(() => expect(screen.getByText("What did you expect?")).toBeTruthy());
  expect(screen.queryByText(/go to Cloudflare's model/)).toBeNull();
  expect(localStorage.getItem("code-village/tutor-privacy-seen")).toBe("1");
});

test("a 429 shows the server's message and keeps the copy button", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(JSON.stringify({ error: "You used your 25 questions for today.", reason: "quota" }), {
        status: 429,
      }),
  );
  render(AskPanel, { lesson, task, snapshot });
  await ask("Why?");
  await vi.waitFor(() => expect(screen.getByText("You used your 25 questions for today.")).toBeTruthy());
  expect(screen.getByRole("button", { name: "Copy for my agent" })).toBeTruthy();
});

test("a reply with HTML is shown as text, never as elements", async () => {
  stubStream('{"text":"Try <img src=x> on a smaller list"}', '{"done":true}');
  const { container } = render(AskPanel, { lesson, task, snapshot });
  await ask("Why?");
  await vi.waitFor(() => expect(screen.getByText(/Try <img src=x> on a smaller list/)).toBeTruthy());
  expect(container.querySelector("img")).toBeNull();
});

test("unregistered shows the join link, and Copy for my agent still works", async () => {
  signOut();
  const clipboard = { writeText: vi.fn<(text: string) => Promise<void>>(async () => {}) };
  Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });
  render(AskPanel, { lesson, task, snapshot });
  expect(screen.queryByRole("button", { name: "Ask the teacher" })).toBeNull();
  const join = screen.getByRole("link", { name: "Join the board in your house to ask the teacher." });
  expect(join.getAttribute("href")).toBe("#/house");
  await fireEvent.click(screen.getByRole("button", { name: "Copy for my agent" }));
  await vi.waitFor(() => expect(clipboard.writeText).toHaveBeenCalled());
  expect(clipboard.writeText.mock.calls[0]?.[0]).toContain("Price for a few");
  expect(screen.getByText("Copied. Paste it into your agent.")).toBeTruthy();
  delete (navigator as { clipboard?: unknown }).clipboard;
});
