import { SPRITE_COLORS } from "../art/palette";
import { MOCHI } from "../art/sprites";

// Where index.html wants Mochi: the splash-mochi plugin in vite.config.ts fills it in at build time.
export const SPLASH_MOCHI_PLACEHOLDER = "<!-- splash-mochi -->";
const EYE_ROW = 5;

// Mochi as crisp SVG pixels in the day colours. At splash size the sprite's dark green eyes read as green, so the
// splash draws them in the palette's eye colour (owner's call) and hands the blink its two colours as variables.
export function mochiSvg(): string {
  const colors = SPRITE_COLORS.day;
  const rects = MOCHI.flatMap((row, y) =>
    [...row].flatMap((ch, x) => {
      if (ch === ".") return [];
      if (y === EYE_ROW && ch === "G") {
        return [`<rect class="splash-eye" x="${x}" y="${y}" width="1" height="1" fill="${colors.e}"/>`];
      }
      return [`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[ch]}"/>`];
    }),
  );
  const blink = `--splash-eye:${colors.e};--splash-lid:${colors.g}`;
  return `<svg viewBox="0 0 ${MOCHI[0].length} ${MOCHI.length}" shape-rendering="crispEdges" style="${blink}">${rects.join("")}</svg>`;
}

export function injectSplashMochi(html: string): string {
  if (!html.includes(SPLASH_MOCHI_PLACEHOLDER)) {
    throw new Error(`index.html has no ${SPLASH_MOCHI_PLACEHOLDER} for the splash`);
  }
  return html.replace(SPLASH_MOCHI_PLACEHOLDER, mochiSvg());
}
