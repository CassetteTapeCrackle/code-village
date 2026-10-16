import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../net/api";
import { signIn, signOut } from "../store/account.svelte";
import BoardView from "./BoardView.svelte";

vi.mock("../net/api", () => ({ api: vi.fn() }));

const apiMock = vi.mocked(api);

const adaRow = {
  nickname: "Ada",
  xp: 135,
  level: 2,
  lessons: 1,
  bossesWon: 1,
  hardWins: 1,
  furthestWorld: "w1",
  lastActive: "2026-10-14",
};
const graceRow = {
  nickname: "Grace",
  xp: 8,
  level: 1,
  lessons: 0,
  bossesWon: 0,
  hardWins: 0,
  furthestWorld: null,
  lastActive: "2026-10-13",
};

function mockApi(all = [adaRow, graceRow], week = [adaRow]): void {
  apiMock.mockImplementation((path: string) => {
    if (path.startsWith("/api/leaderboard")) {
      const period = path.includes("week") ? "week" : "all";
      return Promise.resolve({ ok: true, data: { period, rows: period === "week" ? week : all } });
    }
    if (path === "/api/news") {
      return Promise.resolve({
        ok: true,
        data: { items: [{ nickname: "Ada", kind: "boss_won", id: "guessing-stone", day: "2026-10-10" }] },
      });
    }
    return Promise.resolve({ ok: false, status: 404, error: "No such player." });
  });
}

async function mount(): Promise<void> {
  render(BoardView);
  await tick();
  await Promise.resolve();
  await tick();
}

beforeEach(() => {
  vi.clearAllMocks();
  signOut();
});

test("renders the rows in order with their numbers and the news lines", async () => {
  mockApi();
  await mount();
  const rows = within(screen.getByRole("list", { name: "Rankings" })).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0].textContent).toContain("Ada");
  expect(rows[0].textContent).toContain("135");
  expect(rows[0].textContent).toContain("The Village");
  expect(rows[1].textContent).toContain("Grace");
  expect(screen.getByText(/Ada beat The Guessing Stone/)).toBeTruthy();
  expect(screen.getByRole("link", { name: /Join the board from your house/ }).getAttribute("href")).toBe(
    "#/house",
  );
});

test("switching to the week tab asks for the week board once", async () => {
  mockApi();
  await mount();
  await fireEvent.click(screen.getByRole("button", { name: "This week" }));
  await tick();
  await Promise.resolve();
  await tick();
  expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("period=week"));
  const rows = within(screen.getByRole("list", { name: "Rankings" })).getAllByRole("listitem");
  expect(rows).toHaveLength(1);
  expect(apiMock.mock.calls.map(([path]) => String(path))).toEqual([
    "/api/leaderboard?period=all",
    "/api/news",
    "/api/leaderboard?period=week",
  ]);
});

test("the signed-in player's row is highlighted", async () => {
  signIn({ nickname: "Ada", token: "tok", revision: 0 });
  mockApi();
  await mount();
  const rows = within(screen.getByRole("list", { name: "Rankings" })).getAllByRole("listitem");
  expect(rows[0].classList.contains("me")).toBe(true);
  expect(rows[1].classList.contains("me")).toBe(false);
});

test("an unreachable API shows the offline line", async () => {
  apiMock.mockImplementation(() => Promise.resolve({ ok: false, status: 0, error: "You are offline." }));
  await mount();
  expect(
    screen.getByText("The board needs a connection. Your progress is safe on this device."),
  ).toBeTruthy();
});

test("a nickname with HTML in it renders as literal text", async () => {
  mockApi([{ ...adaRow, nickname: "<b>x</b>" }], []);
  const { container } = render(BoardView);
  await tick();
  await Promise.resolve();
  await tick();
  expect(container.querySelector("b")).toBeNull();
  expect(screen.getByText("<b>x</b>")).toBeTruthy();
});

test("a failed board retries when the network comes back", async () => {
  apiMock.mockImplementation(() => Promise.resolve({ ok: false, status: 0, error: "You are offline." }));
  await mount();
  expect(
    screen.getByText("The board needs a connection. Your progress is safe on this device."),
  ).toBeTruthy();
  mockApi();
  window.dispatchEvent(new Event("online"));
  await tick();
  await Promise.resolve();
  await tick();
  expect(within(screen.getByRole("list", { name: "Rankings" })).getAllByRole("listitem")).toHaveLength(2);
});
