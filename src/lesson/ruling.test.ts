import { afterEach, expect, test, vi } from "vitest";
import { alignToRuling } from "./ruling";

// jsdom has no layout: hand the notebook and its paragraphs the boxes the pass reads, and let a
// paragraph's padding push the paragraphs below it down the way it does in the browser.
type Layout = { nb: HTMLElement; texts: HTMLElement[]; bases: number[] };

let frames: FrameRequestCallback[] = [];
let onResize: ResizeObserverCallback | null = null;
const box = (top: number): DOMRect => new DOMRect(0, top, 100, 56);
const px = (style: string): number => parseFloat(style) || 0;

function notebook(bases: number[]): Layout {
  const nb = document.createElement("div");
  nb.style.paddingTop = "22px";
  nb.getBoundingClientRect = () => box(0);
  const texts = bases.map((_, i) => {
    const text = document.createElement("div");
    text.className = "text";
    nb.append(text);
    text.getBoundingClientRect = () =>
      box(bases[i] + texts.slice(0, i).reduce((sum, t) => sum + px(t.style.paddingTop), 0));
    return text;
  });
  return { nb, texts, bases };
}

function nextFrame(): void {
  const frame = frames;
  frames = [];
  for (const cb of frame) cb(0);
}

// The test setup's ResizeObserver never reports; this one keeps the callback so a test can reflow.
class ReportedResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    onResize = callback;
  }
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function reflow(): void {
  onResize?.([], {} as ResizeObserver);
}

// The e2e check: a paragraph is on the ruling when its first line sits a whole number of rules below
// the notebook's own padding edge.
function offsets(layout: Layout): number[] {
  return layout.texts.map(
    (t) => Math.round(t.getBoundingClientRect().top + px(t.style.paddingTop) - 22) % 28,
  );
}

function setUp(bases: number[]): Layout {
  vi.stubGlobal("ResizeObserver", ReportedResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => (frames = []));
  return notebook(bases);
}

afterEach(() => {
  vi.unstubAllGlobals();
  frames = [];
  onResize = null;
});

test("pads every paragraph onto the ruling, and marks the notebook aligned once it has", () => {
  const layout = setUp([22, 300, 500]);
  alignToRuling(layout.nb, 28);

  expect(layout.nb.dataset.ruling).toBe("pending");
  nextFrame();
  expect(offsets(layout)).toEqual([0, 0, 0]);
  expect(layout.nb.dataset.ruling).toBe("aligned");
});

test("re-pads after a block above a paragraph grows, and stays pending until it has", () => {
  const layout = setUp([22, 300]);
  alignToRuling(layout.nb, 28);
  nextFrame();

  // The lazy editor replaces its stand-in and grows the example above the second paragraph by 19.6 px,
  // the shift that left the e2e check reading 20.
  layout.bases[1] += 19.6;
  reflow();
  expect(layout.nb.dataset.ruling).toBe("pending");
  nextFrame();
  expect(offsets(layout)).toEqual([0, 0]);
  expect(layout.nb.dataset.ruling).toBe("aligned");
});
