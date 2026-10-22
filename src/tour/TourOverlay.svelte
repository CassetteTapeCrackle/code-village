<script lang="ts">
  import { MOCHI, PORTRAITS } from "../art/sprites";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import { TIP_TEXT, TOUR_STEPS, unseenTip, type TipId } from "./tour";
  import { noteTip, tour, tourEvent } from "./tour.svelte";

  // One overlay for the whole tour: Juniper's line, one highlight, and a way out at every step.
  type Box = { left: number; top: number; width: number; height: number };

  let hash = $state(location.hash);
  $effect(() => {
    const onHash = (): void => {
      hash = location.hash;
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  });

  const path = (h: string): string => h.replace(/^#\/?/, "").replace(/\?.*$/, "");
  const here = $derived(path(hash));
  const step = $derived(tour.state.done ? null : TOUR_STEPS.find((s) => s.id === tour.state.step));
  const away = $derived(Boolean(step?.at !== undefined && step.at !== undefined && path(step.at) !== here));

  let box = $state<Box | null>(null);
  function measure(): void {
    const current = step;
    if (!current?.target) {
      box = null;
      return;
    }
    const found = document.querySelector(
      current.place ? `[data-place="${current.target}"]` : `[data-tour="${current.target}"]`,
    );
    if (!(found instanceof Element)) {
      box = null;
      return;
    }
    const rect = found.getBoundingClientRect();
    box =
      rect.width === 0 && rect.height === 0
        ? null
        : { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  $effect(() => {
    void step;
    void hash;
    const timer = setTimeout(measure, 40);
    addEventListener("resize", measure);
    addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timer);
      removeEventListener("resize", measure);
      removeEventListener("scroll", measure, true);
    };
  });

  // The card sits on the side the target is not, so it never covers what it points at.
  const cardLeft = $derived(box ? box.left + box.width / 2 < window.innerWidth / 2 : false);
  const cardTop = $derived(box ? box.top + box.height / 2 > window.innerHeight / 2 : false);
  const bubbleBelow = $derived(box ? box.top < 90 : false);

  function skip(): void {
    tourEvent("skip");
  }
  function next(): void {
    tourEvent("next");
  }
  function back(): void {
    if (step?.at) location.hash = step.at;
  }

  // Mochi's building tips wait until the tour is over and show once per device.
  let tip = $state<TipId | null>(null);
  let tipText = $state("");
  $effect(() => {
    const found = unseenTip(tour.state, hash);
    if (!found) return;
    tip = found;
    tipText = TIP_TEXT[found];
    noteTip(found);
    setTimeout(() => {
      if (tip === found) tip = null;
    }, 7000);
  });
</script>

{#if box && step && !step.place}
  <div
    class="ring"
    aria-hidden="true"
    style="left: {box.left - 6}px; top: {box.top - 6}px; width: {box.width + 12}px; height: {box.height +
      12}px"
  ></div>
{/if}

{#if box && step?.place && step.mochi}
  <div
    class="mochi-bubble"
    class:below={bubbleBelow}
    style="left: {box.left + box.width / 2}px; top: {bubbleBelow ? box.top + box.height + 8 : box.top - 8}px"
  >
    <SpriteCanvas grid={MOCHI} scale={2} />
    <span>{step.mochi}</span>
  </div>
{/if}

{#if step}
  <div
    class="card paper px"
    class:left={cardLeft}
    class:top={cardTop}
    role="dialog"
    aria-modal="false"
    aria-labelledby="tour-heading"
  >
    <div class="who">
      <span class="portrait px"><SpriteCanvas grid={PORTRAITS.teacher} scale={3} /></span>
      <h2 id="tour-heading">Ms. Juniper</h2>
      <button type="button" class="skip" onclick={skip}>Skip the tour</button>
    </div>
    <p class="line" aria-live="polite">{step.text}</p>
    <div class="foot">
      {#if away}<button type="button" onclick={back}>Take me back</button>{/if}
      {#if step.allowNext || step.done === "next"}
        <button type="button" class="primary" onclick={next}>{step.nextLabel ?? "Next"}</button>
      {/if}
    </div>
  </div>
{/if}

{#if tip}
  <div class="tip paper px" role="status">
    <SpriteCanvas grid={MOCHI} scale={2} />
    <span>{tipText}</span>
    <button type="button" aria-label="Close the tip" onclick={() => (tip = null)}>x</button>
  </div>
{/if}

<style>
  .card {
    position: fixed;
    z-index: 40;
    left: 16px;
    bottom: 16px;
    width: min(92vw, 340px);
    padding: 12px 16px 14px;
  }
  .card.left {
    left: auto;
    right: 16px;
  }
  .card.top {
    top: 74px;
    bottom: auto;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .portrait {
    --c: 2px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    background: var(--sky);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .skip {
    margin-left: auto;
    font-size: 13px;
  }
  .line {
    margin: 10px 0;
    font-size: 15px;
    line-height: 1.45;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ring {
    position: fixed;
    z-index: 39;
    pointer-events: none;
    box-shadow:
      0 0 0 3px var(--outline),
      0 0 0 7px var(--butter);
  }
  @media (prefers-reduced-motion: no-preference) {
    .ring {
      animation: glow 1.4s steps(2, end) infinite;
    }
    @keyframes glow {
      50% {
        box-shadow:
          0 0 0 3px var(--outline),
          0 0 0 10px var(--coral);
      }
    }
  }
  .mochi-bubble {
    position: fixed;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 6px;
    max-width: 220px;
    padding: 6px 10px;
    font: 600 14px var(--font-pixel);
    transform: translate(-50%, -100%);
    pointer-events: none;
  }
  .mochi-bubble.below {
    transform: translate(-50%, 0);
  }
  .tip {
    position: fixed;
    z-index: 40;
    left: 16px;
    bottom: 82px;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: min(92vw, 340px);
    padding: 8px 12px;
    font-size: 14px;
  }
  .tip button {
    margin-left: auto;
  }
  @media (max-width: 760px) {
    .card {
      left: 8px;
      right: 8px;
      width: auto;
      bottom: 72px;
    }
    .card.left {
      left: 8px;
      right: 8px;
    }
    .card.top {
      top: 66px;
    }
    .tip {
      left: 8px;
      right: 8px;
      bottom: 140px;
      max-width: none;
    }
  }
</style>
