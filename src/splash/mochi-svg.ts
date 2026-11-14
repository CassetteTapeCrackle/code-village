import { SPRITE_COLORS } from "../art/palette";
import { MOCHI } from "../art/sprites";

// Where index.html wants Mochi: the splash-mochi plugin in vite.config.ts fills it in at build time.
export const SPLASH_MOCHI_PLACEHOLDER = "<!-- splash-mochi -->";
const EYE_ROW = 5;

// Mochi as crisp SVG pixels in the day colours, eye pixels marked so the splash CSS can make them blink.
export function mochiSvg(): string {
  const colors = SPRITE_COLORS.day;
  const rects = MOCHI.flatMap((row, y) =>
    [...row].flatMap((ch, x) => {
      if (ch === ".") return [];
      const eye = y === EYE_ROW && ch === "G" ? 'class="splash-eye" ' : "";
      return [`<rect ${eye}x="${x}" y="${y}" width="1" height="1" fill="${colors[ch]}"/>`];
    }),
  );
  return `<svg viewBox="0 0 ${MOCHI[0].length} ${MOCHI.length}" shape-rendering="crispEdges">${rects.join("")}</svg>`;
}

export function injectSplashMochi(html: string): string {
  if (!html.includes(SPLASH_MOCHI_PLACEHOLDER)) {
    throw new Error(`index.html has no ${SPLASH_MOCHI_PLACEHOLDER} for the splash`);
  }
  return html.replace(SPLASH_MOCHI_PLACEHOLDER, mochiSvg());
}
