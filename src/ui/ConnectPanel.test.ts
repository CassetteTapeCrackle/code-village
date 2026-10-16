import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../net/api";
import { signIn, signOut } from "../store/account.svelte";
import ConnectPanel from "./ConnectPanel.svelte";

vi.mock("../net/api", () => ({ api: vi.fn() }));

const apiMock = vi.mocked(api);
const noToken = { ok: true, data: { exists: false, createdAt: null } } as const;
const hasToken = { ok: true, data: { exists: true, createdAt: "2026-10-14T09:00:00.000Z" } } as const;

async function mount(): Promise<void> {
  render(ConnectPanel);
  await tick();
  await Promise.resolve();
  await tick();
}

async function open(): Promise<void> {
  await fireEvent.click(screen.getByRole("button", { name: "Connect your agent" }));
  await tick();
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut();
  signIn({ nickname: "Ada", token: "main-token", revision: 0 });
});

test("opening the fold loads the status and offers the first token", async () => {
  apiMock.mockResolvedValueOnce(noToken);
  await mount();
  await open();
  expect(apiMock).toHaveBeenCalledWith("/api/agent-token", { token: "main-token" });
  expect(screen.getByRole("button", { name: "Make an agent token" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Revoke" })).toBeNull();
});

test("a new token is shown once with the setup commands, Copy token copies it, and Done hides it", async () => {
  apiMock.mockResolvedValueOnce(noToken);
  apiMock.mockResolvedValueOnce({
    ok: true,
    data: { token: "agent-token-1", createdAt: "2026-10-14T09:00:00.000Z" },
  });
  const writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  await mount();
  await open();
  await fireEvent.click(screen.getByRole("button", { name: "Make an agent token" }));
  await tick();
  expect(apiMock).toHaveBeenCalledWith("/api/agent-token", { method: "POST", token: "main-token" });
  expect(screen.getByText("agent-token-1")).toBeTruthy();
  expect(screen.getByText(/claude mcp add --transport http code-village/)).toBeTruthy();
  expect(screen.getByText(/\[mcp_servers\.code-village\]/)).toBeTruthy();
  expect(screen.getByText(/"type": "remote"/)).toBeTruthy();
  expect(screen.getByText(/Your agent can read your current task, code and results\./)).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Copy token" }));
  await tick();
  expect(writeText).toHaveBeenCalledWith("agent-token-1");
  expect(screen.getByText("Copied.")).toBeTruthy();
  // copying leaves the token and its commands on screen; only Done hides them
  expect(screen.getByText("agent-token-1")).toBeTruthy();
  for (const tool of ["Claude Code", "Codex", "opencode"]) {
    await fireEvent.click(screen.getByRole("button", { name: `Copy the ${tool} command` }));
  }
  expect(writeText).toHaveBeenCalledTimes(4);
  await fireEvent.click(screen.getByRole("button", { name: "Done" }));
  await tick();
  expect(screen.queryByText("agent-token-1")).toBeNull();
  expect(screen.queryByRole("button", { name: "Copy the Codex command" })).toBeNull();
});

test("an existing token shows Make a new one with the warning, and revoke deletes it", async () => {
  apiMock.mockResolvedValueOnce(hasToken);
  apiMock.mockResolvedValueOnce({ ok: true, data: null });
  await mount();
  await open();
  expect(screen.getByRole("button", { name: "Make a new one" })).toBeTruthy();
  expect(screen.getByText(/The old one stops working\./)).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
  await tick();
  expect(apiMock).toHaveBeenCalledWith("/api/agent-token", { method: "DELETE", token: "main-token" });
  expect(screen.getByRole("button", { name: "Make an agent token" })).toBeTruthy();
});

test("no make button until the status is known", async () => {
  let go!: () => void;
  const gate = new Promise<void>((resolve) => (go = resolve));
  apiMock.mockImplementationOnce(async () => {
    await gate;
    return noToken;
  });
  await mount();
  await open();
  expect(screen.queryByRole("button", { name: "Make an agent token" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Make a new one" })).toBeNull();
  go();
  await tick();
  await Promise.resolve();
  await tick();
  expect(screen.getByRole("button", { name: "Make an agent token" })).toBeTruthy();
});

test("a failed status load says so instead of pretending", async () => {
  apiMock.mockResolvedValueOnce({
    ok: false,
    status: 401,
    error: "Sign in again: this device is not registered.",
  });
  await mount();
  await open();
  expect(screen.getByText("Sign in again: this device is not registered.")).toBeTruthy();
});

test("a failed status load offers Try again, which loads the status", async () => {
  apiMock.mockResolvedValueOnce({
    ok: false,
    status: 401,
    error: "Sign in again: this device is not registered.",
  });
  apiMock.mockResolvedValueOnce(noToken);
  await mount();
  await open();
  await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await tick();
  expect(screen.getByRole("button", { name: "Make an agent token" })).toBeTruthy();
});

test("a new token's date is the server's, not this device's clock", async () => {
  apiMock.mockResolvedValueOnce(noToken);
  apiMock.mockResolvedValueOnce({
    ok: true,
    data: { token: "agent-token-2", createdAt: "2020-01-02T09:00:00.000Z" },
  });
  await mount();
  await open();
  await fireEvent.click(screen.getByRole("button", { name: "Make an agent token" }));
  await tick();
  expect(screen.getByText(/since 2020-01-02/)).toBeTruthy();
});
