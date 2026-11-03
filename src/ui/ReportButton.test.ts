import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, expect, test, vi } from "vitest";
import { sendReport } from "../net/api";
import ReportButton from "./ReportButton.svelte";
import { renderTurnstile } from "./turnstile";

vi.mock("../net/api", () => ({ sendReport: vi.fn() }));
vi.mock("./turnstile", () => ({ renderTurnstile: vi.fn(async () => "tok") }));

const sendMock = vi.mocked(sendReport);
const turnstileMock = vi.mocked(renderTurnstile);

async function settle(): Promise<void> {
  await tick();
  await Promise.resolve();
  await tick();
}

async function openForm(code = "print(3)"): Promise<void> {
  render(ReportButton, { item: "values-total-price", code });
  await fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
  await settle();
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ ok: true, data: { ok: true } });
});

test("the form stays closed and loads no human check until asked", () => {
  render(ReportButton, { item: "values-total-price", code: "" });
  expect(screen.queryByLabelText(/What looks wrong/)).toBeNull();
  expect(turnstileMock).not.toHaveBeenCalled();
});

test("sending a report posts the item, the current code and the message", async () => {
  await openForm("print(3)");
  await fireEvent.input(screen.getByLabelText(/What looks wrong/), { target: { value: "Check refused it" } });
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(sendMock).toHaveBeenCalledWith({
    kind: "button",
    item: "values-total-price",
    code: "print(3)",
    message: "Check refused it",
    turnstile: "tok",
  });
  expect(screen.getByText("Thanks. We will look at it.")).toBeTruthy();
  expect(screen.queryByLabelText(/What looks wrong/)).toBeNull();
});

test("an empty message is left out of the report", async () => {
  await openForm();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(sendMock.mock.calls[0][0]).not.toHaveProperty("message");
});

test("a refused report keeps the form open and shows why", async () => {
  sendMock.mockResolvedValue({ ok: false, status: 429, error: "Too many reports from here today." });
  await openForm();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(screen.getByText("Too many reports from here today.")).toBeTruthy();
  expect(screen.getByLabelText(/What looks wrong/)).toBeTruthy();
});

test("sending before the human check is ready asks to wait and sends nothing", async () => {
  turnstileMock.mockReturnValue(new Promise(() => {}));
  await openForm();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(sendMock).not.toHaveBeenCalled();
  expect(screen.getByText(/still loading/)).toBeTruthy();
});

test("the form says what a report sends", async () => {
  await openForm();
  expect(screen.getByText(/your code and your message/)).toBeTruthy();
});
