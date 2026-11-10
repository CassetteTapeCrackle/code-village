// For the ruled notebook: blocks between paragraphs (examples, tasks) are not a whole number of
// rules tall, so pad each paragraph down until it starts on the ruling again.
// Padding, not margin: a margin would collapse into the block above's own margin.
export function alignToRuling(node: HTMLElement, rule: number): { destroy: () => void } {
  let frame = 0;
  const snap = (): void => {
    const first = parseFloat(getComputedStyle(node).paddingTop);
    for (const text of node.querySelectorAll<HTMLElement>(":scope > .text")) {
      text.style.paddingTop = "0px";
      const offset = text.getBoundingClientRect().top - node.getBoundingClientRect().top;
      const pad = (((first - offset) % rule) + rule) % rule;
      // Already on the ruling but a hair above it in floating point: no padding, not a whole extra rule.
      text.style.paddingTop = `${pad > rule - 0.01 ? 0 : pad}px`;
    }
    // A layout check can read this instead of guessing how many frames a reflow takes.
    node.dataset.ruling = "aligned";
  };
  // A block growing or the page reflowing changes the notebook's own size. The callback writes
  // padding, which resizes the node, so run it on the next frame: a write inside the observer's own
  // delivery is what the browser reports as "ResizeObserver loop completed with undelivered notifications".
  const later = (): void => {
    node.dataset.ruling = "pending";
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(snap);
  };
  const observer = new ResizeObserver(later);
  observer.observe(node);
  later();
  return {
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
