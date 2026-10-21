<script lang="ts">
  import type { Grid } from "../art/draw";
  import { MOCHI, PORTRAITS, TRAVELLER } from "../art/sprites";
  import SpriteCanvas from "./SpriteCanvas.svelte";

  // An RPG-style speech box: a framed portrait, a name, and a line.
  let { who, line, portrait = "teacher" }: { who: string; line: string; portrait?: string } = $props();
  const grids: Record<string, Grid> = { ...PORTRAITS, mochi: MOCHI };
</script>

<div class="dialog paper px" role="status">
  <div class="portrait px">
    <SpriteCanvas grid={grids[portrait] ?? TRAVELLER} scale={portrait === "mochi" ? 4 : 5} />
  </div>
  <div class="words">
    <div class="who">{who}</div>
    <p>{line}</p>
  </div>
</div>

<style>
  .dialog {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    padding: 14px 18px 16px;
    margin: 12px 0 16px;
  }
  .portrait {
    --c: 3px;
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    background: var(--sky);
    box-shadow: inset 0 0 0 4px var(--outline);
  }
  .who {
    font: 700 18px var(--font-pixel);
    color: var(--coral-2);
  }
  :global([data-palette="night"]) .who {
    color: var(--coral);
  }
  p {
    margin: 2px 0 0;
    font-size: 17px;
    line-height: round(1.6em, 1px);
  }
</style>
