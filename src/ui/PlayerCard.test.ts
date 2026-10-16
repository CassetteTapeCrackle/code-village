import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { expect, test, vi } from "vitest";
import { api } from "../net/api";
import PlayerCard from "./PlayerCard.svelte";

vi.mock("../net/api", () => ({ api: vi.fn() }));

const apiMock = vi.mocked(api);

async function mount(): Promise<void> {
  render(PlayerCard, { props: { nickname: "Ada", onclose: () => {} } });
  await tick();
  await Promise.resolve();
  await tick();
}

test("an offline card says the board needs a connection", async () => {
  apiMock.mockResolvedValueOnce({ ok: false, status: 0, error: "You are offline." });
  await mount();
  expect(
    screen.getByText("The board needs a connection. Your progress is safe on this device."),
  ).toBeTruthy();
  expect(screen.queryByText("No such player.")).toBeNull();
});

test("an unknown nickname says there is no such player", async () => {
  apiMock.mockResolvedValueOnce({ ok: false, status: 404, error: "No such player." });
  await mount();
  expect(screen.getByText("No such player.")).toBeTruthy();
});
