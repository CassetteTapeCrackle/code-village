// Writes src/styles/palette.css from src/styles/palette.json (Node runs this TypeScript directly).
import { readFileSync, writeFileSync } from "node:fs";
import { renderPaletteCss } from "../src/styles/palette-css.ts";

const palette = JSON.parse(readFileSync("src/styles/palette.json", "utf8"));
writeFileSync("src/styles/palette.css", renderPaletteCss(palette));
console.log("palette: wrote src/styles/palette.css");
