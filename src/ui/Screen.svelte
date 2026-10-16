<script lang="ts">
  import type { Snippet } from "svelte";
  import { board } from "./board.svelte";

  export type Here = "school" | "garden" | "library" | "house" | "sandbox" | "board" | "boss" | null;
  // A place's signboard: one wooden board over the village, docked beside its building, with a trim that says where
  // you are, the title, a close back to the map (Esc does the same) and one paper sheet for the content.
  let {
    title,
    here = null,
    wide = false,
    badges,
    children,
  }: {
    title: string;
    here?: Here;
    wide?: boolean;
    badges?: Snippet;
    children: Snippet;
  } = $props();

  // a wide board is a lesson's open book at the school, or a boss's stone arena
  const trim = $derived(wide && here === "school" ? "book" : (here ?? "plain"));
</script>

<section
  class="board trim-{trim}"
  class:wide
  class:left={!wide && board.side === "left"}
  aria-labelledby="board-title"
>
  <div class="board-in">
    <header class="head">
      <h1 id="board-title">{title}</h1>
      {#if badges}<div class="badges">{@render badges()}</div>{/if}
      <a class="close" href={board.back}><kbd>Esc</kbd> <span>{board.backLabel}</span></a>
    </header>
    <div class="sheet"><div class="content">{@render children()}</div></div>
  </div>
</section>

<style>
  .board {
    position: absolute;
    top: 16px;
    right: 16px;
    bottom: 16px;
    width: min(720px, 56%);
    pointer-events: auto;
    filter: drop-shadow(0 8px 0 rgb(0 0 0 / 0.3));
  }
  .board.left {
    right: auto;
    left: 16px;
  }
  .board.wide {
    right: 16px;
    left: 16px;
    width: auto;
    max-width: 1180px;
    margin: 0 auto;
  }
  .board-in {
    --c: 6px;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    background: var(--wood);
    background-image: repeating-linear-gradient(0deg, transparent 0 22px, rgb(0 0 0 / 0.06) 22px 24px);
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 4px 0 4px var(--wood-hi),
      inset 0 -4px 0 4px var(--wood-3);
    clip-path: polygon(
      var(--c) 0,
      calc(100% - var(--c)) 0,
      calc(100% - var(--c)) var(--c),
      100% var(--c),
      100% calc(100% - var(--c)),
      calc(100% - var(--c)) calc(100% - var(--c)),
      calc(100% - var(--c)) 100%,
      var(--c) 100%,
      var(--c) calc(100% - var(--c)),
      0 calc(100% - var(--c)),
      0 var(--c),
      var(--c) var(--c)
    );
  }
  .head {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    min-height: 52px;
    padding: 4px 8px 16px;
    color: var(--ink-light);
  }
  .head h1 {
    margin: 0;
    font-size: clamp(22px, 2.6vw, 30px);
    line-height: 1.1;
    color: var(--ink-light);
    text-shadow: 2px 2px 0 var(--outline);
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .close {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    font: 600 14px var(--font-pixel);
    color: var(--chalk);
    text-decoration: none;
    white-space: nowrap;
  }
  .close:hover span {
    text-decoration: underline;
  }
  .close:focus-visible {
    outline: 3px solid var(--butter);
    outline-offset: 2px;
  }
  kbd {
    padding: 1px 6px 2px;
    font: 12px var(--font-pixel);
    background: var(--wood-3);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .sheet {
    flex: 1;
    min-height: 0;
    display: flex;
    background: var(--bg);
    box-shadow: inset 0 0 0 4px var(--outline);
  }
  .content {
    flex: 1;
    min-width: 0;
    overflow: auto;
    padding: 18px;
    scrollbar-width: thin;
    scrollbar-color: var(--wood-2) transparent;
  }

  /* trims: the band under the title says which place this is */
  .head::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 4px;
    height: 6px;
  }
  .trim-school .head::after {
    height: 8px;
    background: var(--slate);
    box-shadow:
      0 -2px 0 var(--outline),
      0 2px 0 var(--outline);
  }
  .trim-library .head::after {
    height: 10px;
    bottom: 3px;
    background: repeating-linear-gradient(
      90deg,
      var(--coral-2) 0 9px,
      var(--outline) 9px 11px,
      var(--slate-2) 11px 18px,
      var(--outline) 18px 20px,
      var(--butter) 20px 25px,
      var(--outline) 25px 27px,
      var(--matcha-2) 27px 36px,
      var(--outline) 36px 38px,
      var(--plum) 38px 44px,
      var(--outline) 44px 46px
    );
  }
  .trim-garden .head::after {
    height: 12px;
    bottom: 2px;
    background: repeating-linear-gradient(90deg, var(--chalk) 0 6px, transparent 6px 16px);
    box-shadow: inset 0 -4px 0 var(--chalk);
  }
  .trim-house .board-in {
    background-color: var(--wood-2);
    background-image: radial-gradient(var(--coral) 1.5px, transparent 2px);
    background-size: 14px 14px;
  }
  .trim-house .head::after {
    background: var(--wood-hi);
    box-shadow:
      0 2px 0 var(--outline),
      0 -2px 0 var(--outline);
  }
  .trim-sandbox .board-in {
    background-color: var(--wood-hi);
    background-image: radial-gradient(rgb(0 0 0 / 0.12) 1px, transparent 1.5px);
    background-size: 6px 6px;
  }
  .trim-board .head::after {
    height: 8px;
    background: repeating-linear-gradient(90deg, var(--paper) 0 16px, var(--outline) 16px 18px);
    box-shadow:
      0 -2px 0 var(--outline),
      0 2px 0 var(--outline);
  }
  .trim-boss .board-in {
    background-color: #8e938a;
    background-image:
      linear-gradient(90deg, rgb(0 0 0 / 0.16) 2px, transparent 2px),
      linear-gradient(rgb(0 0 0 / 0.16) 2px, transparent 2px);
    background-size: 36px 18px;
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 4px 0 4px #b3b8ad,
      inset 0 -4px 0 4px #63675f;
  }
  .trim-book .board-in {
    background-color: var(--coral-2);
    background-image: none;
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 4px 0 4px var(--coral),
      inset 0 -4px 0 4px #9c4c38;
  }

  /* at night a lantern lights the paper from the top corner */
  .sheet {
    position: relative;
  }
  :global([data-palette="night"]) .sheet::after {
    content: "";
    position: absolute;
    inset: 4px;
    pointer-events: none;
    background: radial-gradient(circle at 10% 0%, rgb(242 199 92 / 0.14), transparent 55%);
  }

  @media (prefers-reduced-motion: no-preference) {
    /* drops in on four frames: falls, overshoots 3px, settles */
    .board {
      animation: board-drop 320ms steps(1, end) both;
    }
    @keyframes board-drop {
      0% {
        translate: 0 -56px;
        opacity: 0;
      }
      25% {
        translate: 0 -22px;
        opacity: 1;
      }
      50% {
        translate: 0 -4px;
      }
      75% {
        translate: 0 3px;
      }
      100% {
        translate: 0 0;
      }
    }
  }
  @media (max-width: 760px) {
    /* a place board becomes a sheet over the bottom of the screen, so its building stays in view above it */
    .board,
    .board.left {
      top: 38%;
      right: 0;
      bottom: 0;
      left: 0;
      width: auto;
      filter: drop-shadow(0 -5px 0 rgb(0 0 0 / 0.25));
    }
    .board.wide {
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      width: auto;
      max-width: none;
    }
    .board-in {
      --c: 0px;
    }
    .board:not(.wide) .head::before {
      content: "";
      position: absolute;
      left: calc(50% - 24px);
      top: -2px;
      width: 48px;
      height: 6px;
      background: var(--wood-3);
      box-shadow: inset 0 0 0 2px var(--outline);
    }
    .board-in {
      padding: 6px;
    }
    .content {
      padding: 12px;
    }
    .close kbd {
      display: none;
    }
  }
  @media (max-width: 760px) and (prefers-reduced-motion: no-preference) {
    /* the sheet slides up from the thumb instead of dropping from the top */
    .board:not(.wide) {
      animation-name: sheet-up;
    }
    @keyframes sheet-up {
      0% {
        translate: 0 60%;
        opacity: 1;
      }
      25% {
        translate: 0 24%;
      }
      50% {
        translate: 0 4%;
      }
      75% {
        translate: 0 -1%;
      }
      100% {
        translate: 0 0;
      }
    }
  }
</style>
