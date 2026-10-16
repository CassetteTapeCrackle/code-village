// The open board: the village picks its side (so it never covers the building), the app sets where Close leads.
export type BoardSide = "left" | "right";
export const board: { side: BoardSide; back: string; backLabel: string } = $state({
  side: "right",
  back: "#/",
  backLabel: "Back to the map",
});

// A docked board's width, matching Screen.svelte's CSS (min(720px, 56%) of the stage), so the village can frame the rest.
export function boardWidth(stageWidth: number): number {
  return Math.min(720, stageWidth * 0.56);
}

// Narrow screens: the board covers the stage, and the village just stays behind it.
export const NARROW = 760;
