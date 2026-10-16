// For pop-up banners: focus the first button when it opens, keep Tab inside, and close on Escape.
export function modal(node: HTMLElement, onClose: () => void): { destroy: () => void } {
  const buttons = (): HTMLElement[] => [...node.querySelectorAll<HTMLElement>("button, a[href]")];
  const before = document.activeElement as HTMLElement | null;
  buttons()[0]?.focus();
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const list = buttons();
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };
  node.addEventListener("keydown", onKey);
  return {
    destroy: () => {
      node.removeEventListener("keydown", onKey);
      before?.focus?.();
    },
  };
}
