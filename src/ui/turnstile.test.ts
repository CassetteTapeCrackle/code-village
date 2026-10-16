import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete (window as { turnstile?: unknown }).turnstile;
});

// Captures each <script> the loader appends so a test can fire its onload or onerror by hand.
function captureScripts(): HTMLScriptElement[] {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation(((node: Node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  }) as typeof document.head.appendChild);
  return scripts;
}

test("a failed script load is retriable instead of cached as a permanent failure", async () => {
  const scripts = captureScripts();
  (window as unknown as { turnstile: unknown }).turnstile = {
    render: (_element: HTMLElement, options: { callback: (token: string) => void }) =>
      options.callback("tok"),
  };
  const { renderTurnstile } = await import("./turnstile");
  const element = document.createElement("div");

  const first = renderTurnstile(element);
  scripts[0].onerror?.(new Event("error"));
  await expect(first).rejects.toThrow("could not load");

  const second = renderTurnstile(element);
  expect(scripts).toHaveLength(2); // a fresh script, not the cached rejection
  scripts[1].onload?.(new Event("load"));
  await expect(second).resolves.toBe("tok");
});
