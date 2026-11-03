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
  turnstileMock.mockResolvedValue("tok");
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

test("a refused send renders a fresh human check and the retry carries its new token", async () => {
  turnstileMock.mockResolvedValueOnce("first").mockResolvedValueOnce("second");
  sendMock.mockResolvedValueOnce({ ok: false, status: 403, error: "The human check failed. Try again." });
  await openForm();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(turnstileMock).toHaveBeenCalledTimes(2);
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(sendMock.mock.calls[1][0]).toMatchObject({ turnstile: "second" });
});

test("a human check that fails to load offers a fresh one instead of waiting forever", async () => {
  turnstileMock
    .mockRejectedValueOnce(new Error("The human check could not load."))
    .mockResolvedValueOnce("tok");
  await openForm();
  expect(screen.getByText("The human check could not load.")).toBeTruthy();
  await fireEvent.click(screen.getByRole("button", { name: "Try the human check again" }));
  await settle();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(sendMock).toHaveBeenCalledTimes(1);
});

test("focus moves into the form on open and back to the button on cancel and on send", async () => {
  await openForm();
  expect(document.activeElement).toBe(screen.getByLabelText(/What looks wrong/));
  await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await settle();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Report a problem" }));
  await fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
  await settle();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Report a problem" }));
});

test("Cancel is disabled while a report is on its way", async () => {
  sendMock.mockReturnValue(new Promise(() => {}));
  await openForm();
  await fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await settle();
  expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
});

test("a lesson report without code says it sends only the id and the message", async () => {
  render(ReportButton, { item: "values", code: "" });
  await fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
  await settle();
  expect(screen.queryByText(/your code/)).toBeNull();
  expect(screen.getByText(/leave out personal details/)).toBeTruthy();
});
