// Turns palette.json into CSS variables: day on :root, night on [data-palette="night"].
type PaletteFile = { day: { ui: Record<string, string> }; night: { ui: Record<string, string> } };

export function renderPaletteCss(palette: PaletteFile): string {
  const vars = (ui: Record<string, string>): string =>
    Object.entries(ui)
      .map(([name, value]) => `  --${name}: ${value};`)
      .join("\n");
  return [
    "/* Generated from palette.json by `pnpm palette`. Do not edit by hand. */",
    `:root {\n${vars(palette.day.ui)}\n  color-scheme: light;\n}`,
    `:root[data-palette="night"] {\n${vars(palette.night.ui)}\n  color-scheme: dark;\n}`,
    "",
  ].join("\n");
}
