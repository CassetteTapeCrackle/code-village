// Pixel-art shapes for the villagers' speech bubbles, as CSS clip-path polygons in world pixels.

/** How far each row of a rounded corner is pulled in, top row first: a round comic bubble's corner. */
export const BUBBLE_CORNER = [5, 3, 2, 1, 1] as const;

/** A rectangle whose corners step inward row by row, so it reads as round at pixel scale. */
export function pixelRoundRect(insets: readonly number[], px: number): string {
  const n = insets.length;
  const x = (k: number): string => `${insets[k] * px}px`;
  const right = (k: number): string => `calc(100% - ${insets[k] * px}px)`;
  const down = (rows: number): string => `${rows * px}px`;
  const up = (rows: number): string => `calc(100% - ${rows * px}px)`;
  const points: string[] = [];
  for (let k = n - 1; k >= 0; k--) points.push(`${x(k)} ${down(k + 1)}`, `${x(k)} ${down(k)}`); // top left, going up
  for (let k = 0; k < n; k++) points.push(`${right(k)} ${down(k)}`, `${right(k)} ${down(k + 1)}`); // top right, going down
  for (let k = n - 1; k >= 0; k--) points.push(`${right(k)} ${up(k + 1)}`, `${right(k)} ${up(k)}`); // bottom right
  for (let k = 0; k < n; k++) points.push(`${x(k)} ${up(k)}`, `${x(k)} ${up(k + 1)}`); // bottom left, going up
  return `polygon(${points.join(", ")})`;
}

/** The tail: a staircase triangle, straight on the left so its tip sits over the speaker's head. */
export function pixelTail(rows: number, px: number): string {
  const points = ["0 0", `${rows * px}px 0`];
  for (let k = 1; k <= rows; k++)
    points.push(`${(rows - k + 1) * px}px ${k * px}px`, `${(rows - k) * px}px ${k * px}px`);
  points.push(`0 ${rows * px}px`);
  return `polygon(${points.join(", ")})`;
}
