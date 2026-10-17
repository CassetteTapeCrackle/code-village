import { afterEach, expect, test } from "vitest";
import { modal } from "./modal";

let cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

// A pop-up with two buttons, mounted and wired the way the components do it.
function popup(): { first: HTMLElement; last: HTMLElement; closed: () => number } {
  const node = document.createElement("div");
  node.innerHTML = '<button type="button">First</button><button type="button">Last</button>';
  document.body.append(node);
  const [first, last] = [...node.querySelectorAll<HTMLElement>("button")];
  let closed = 0;
  const action = modal(node, () => (closed += 1));
  cleanups.push(() => {
    action.destroy();
    node.remove();
  });
  return { first, last, closed: () => closed };
}

test("Escape closes the pop-up even when focus has left it", () => {
  const { first, closed } = popup();
  expect(document.activeElement).toBe(first); // the first button takes focus
  (document.activeElement as HTMLElement).blur();
  expect(document.activeElement).toBe(document.body);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(closed()).toBe(1);
});

test("Tab stays inside the pop-up", () => {
  const { first, last } = popup();
  expect(document.activeElement).toBe(first);
  first.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }),
  );
  expect(document.activeElement).toBe(last);
  last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(first);
});
