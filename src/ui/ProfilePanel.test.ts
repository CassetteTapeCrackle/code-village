import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../net/api";
import { signIn, signOut, account } from "../store/account.svelte";
import { backfill } from "../store/sync.svelte";
import ProfilePanel from "./ProfilePanel.svelte";
import { renderTurnstile } from "./turnstile";

vi.mock("../net/api", () => ({ api: vi.fn() }));
vi.mock("./turnstile", () => ({ renderTurnstile: vi.fn(async () => "tok") }));
vi.mock("../store/sync.svelte", () => ({
  backfill: vi.fn(),
  flushNow: vi.fn(async () => "sent"),
  syncConflict: { current: null },
}));

const apiMock = vi.mocked(api);
const backfillMock = vi.mocked(backfill);
const renderTurnstileMock = vi.mocked(renderTurnstile);

async function mount(): Promise<void> {
  render(ProfilePanel);
  await tick();
  await Promise.resolve();
  await tick();
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.mockResolvedValue({ ok: true, data: { exists: false, createdAt: null } });
  signOut();
});

test("join shows the recovery code once and calls backfill", async () => {
  apiMock.mockResolvedValueOnce({
    ok: true,
    data: { nickname: "Ada", token: "tok", recoveryCode: "maple-otter-brick-lantern-42" },
  });
  await mount();
  await fireEvent.input(screen.getByLabelText("Nickname"), { target: { value: "Ada" } });
  await fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await tick();
  expect(apiMock).toHaveBeenCalledWith("/api/register", {
    method: "POST",
    body: { nickname: "Ada", turnstile: "tok" },
  });
  expect(screen.getByText("maple-otter-brick-lantern-42")).toBeTruthy();
  expect(backfillMock).toHaveBeenCalledTimes(1);
  await fireEvent.click(screen.getByRole("button", { name: "Done" }));
  await tick();
  expect(screen.queryByText("maple-otter-brick-lantern-42")).toBeNull();
});

test("an invalid nickname shows the message without calling the API", async () => {
  await mount();
  await fireEvent.input(screen.getByLabelText("Nickname"), { target: { value: "ab" } });
  await fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await tick();
  expect(screen.getByText("Use 3 to 20 letters, digits, - or _.")).toBeTruthy();
  expect(apiMock).not.toHaveBeenCalled();
});

test("a taken nickname shows the server message", async () => {
  apiMock.mockResolvedValueOnce({ ok: false, status: 409, error: "That nickname is taken." });
  await mount();
  await fireEvent.input(screen.getByLabelText("Nickname"), { target: { value: "Ada" } });
  await fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await tick();
  expect(screen.getByText("That nickname is taken.")).toBeTruthy();
});

test("joining while the board is unreachable shows a clear line, not the raw error", async () => {
  apiMock.mockResolvedValueOnce({ ok: false, status: 0, error: "You are offline." });
  await mount();
  await fireEvent.input(screen.getByLabelText("Nickname"), { target: { value: "Ada" } });
  await fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await tick();
  expect(
    screen.getByText("The village board can't be reached right now. Try again in a moment."),
  ).toBeTruthy();
});

test("recovering while the board returns a server error shows the same clear line", async () => {
  apiMock.mockResolvedValueOnce({ ok: false, status: 502, error: "Request failed (502)" });
  await mount();
  await fireEvent.input(screen.getByLabelText("Recovery code"), {
    target: { value: "maple-otter-brick-lantern-42" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Recover" }));
  await tick();
  expect(
    screen.getByText("The village board can't be reached right now. Try again in a moment."),
  ).toBeTruthy();
});

test("a widget script load error shows a message and a Try again that reloads the check", async () => {
  renderTurnstileMock.mockRejectedValueOnce(new Error("The human check could not load."));
  renderTurnstileMock.mockResolvedValueOnce("tok");
  await mount();
  expect(screen.getByText("The human check could not load.")).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await tick();
  await Promise.resolve();
  await tick();
  // the fresh widget loaded, so a Join now reaches the API
  apiMock.mockResolvedValueOnce({
    ok: true,
    data: { nickname: "Ada", token: "t", recoveryCode: "fox-ant-bee-owl-42" },
  });
  await fireEvent.input(screen.getByLabelText("Nickname"), { target: { value: "Ada" } });
  await fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await tick();
  expect(apiMock).toHaveBeenCalledWith("/api/register", {
    method: "POST",
    body: { nickname: "Ada", turnstile: "tok" },
  });
});

test("delete me asks first, then calls DELETE", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  await mount();
  expect(screen.getByRole("button", { name: "Connect your agent" })).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Delete me" }));
  await tick();
  expect(screen.getByText(/This removes your nickname/)).toBeTruthy();
  expect(apiMock).not.toHaveBeenCalledWith("/api/me", expect.anything());
  await fireEvent.click(screen.getByRole("button", { name: "Yes, delete me" }));
  await tick();
  expect(apiMock).toHaveBeenCalledWith("/api/me", { method: "DELETE", token: "tok" });
});

test("recovering with no cloud save backfills this device's progress", async () => {
  apiMock.mockImplementation((path: string) => {
    if (path === "/api/recover")
      return Promise.resolve({ ok: true, data: { nickname: "Ada", token: "tok" } });
    if (path === "/api/save") return Promise.resolve({ ok: true, data: { revision: 0, blob: null } });
    return Promise.resolve({ ok: false, status: 404, error: "nope" });
  });
  await mount();
  await fireEvent.input(screen.getByLabelText("Recovery code"), {
    target: { value: "maple-otter-brick-lantern-42" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Recover" }));
  await tick();
  expect(backfillMock).toHaveBeenCalledTimes(1);
});

test("recovering a save that cannot be read shows the error and keeps the revision at 0", async () => {
  apiMock.mockImplementation((path: string) => {
    if (path === "/api/recover")
      return Promise.resolve({ ok: true, data: { nickname: "Ada", token: "tok" } });
    if (path === "/api/save") return Promise.resolve({ ok: true, data: { revision: 7, blob: "not json" } });
    return Promise.resolve({ ok: false, status: 404, error: "nope" });
  });
  await mount();
  await fireEvent.input(screen.getByLabelText("Recovery code"), {
    target: { value: "maple-otter-brick-lantern-42" },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Recover" }));
  await tick();
  expect(screen.getByText("This file is not a Code Village save.")).toBeTruthy();
  expect(account.current?.revision).toBe(0);
});
