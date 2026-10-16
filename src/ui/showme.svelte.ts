import type { Point } from "../village/grid";

// "Show me" from a board: the board closes, and the village scrolls to the spot with a caption and a way back.
export const showMe: { at: Point | null; label: string; back: string; backLabel: string } = $state({
  at: null,
  label: "",
  back: "#/",
  backLabel: "",
});

export function showOnMap(at: Point, label: string, back: string, backLabel: string): void {
  showMe.at = at;
  showMe.label = label;
  showMe.back = back;
  showMe.backLabel = backLabel;
  location.hash = "#/";
}

export function clearShowMe(): void {
  showMe.at = null;
}
