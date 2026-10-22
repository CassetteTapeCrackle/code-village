<script lang="ts">
  import { MOCHI, PORTRAITS } from "../art/sprites";
  import { parseRoute } from "../route";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import {
    cardSpot,
    clipBox,
    TIP_TEXT,
    TOUR_STEPS,
    targetBox,
    waitingAt,
    unseenTip,
    type TipId,
  } from "./tour";
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
  // The card only speaks on the screen its step points at (any lesson counts for the teacher step), so it
  // never sits on another screen.
  const away = $derived(Boolean(step?.at && parseRoute(step.at).name !== parseRoute(hash).name));

  // Nor over a dialog the screen itself put up: a boss defeat, a conflict, a level greeting. The tour's own
  // card is a dialog too, so it is not counted.
  let blocked = $state(false);
  $effect(() => {
    const check = (): void => {
      blocked = Array.from(document.querySelectorAll('[role="dialog"]')).some(
        (el) => !el.classList.contains("tour-card"),
      );
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["role"],
    });
    return () => observer.disconnect();
  });

  let box = $state<Box | null>(null);
  let bounds = $state<Box | null>(null);

  const viewportBox = (): Box => ({
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  function scrollParent(el: Element): Element | null {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(`${style.overflowX} ${style.overflowY}`)) return node;
    }
    return null;
  }

  // What a target's scroll panel shows: past this the fixed ring would float over other content.
  function visibleBounds(target: Element): Box {
    const viewport = viewportBox();
    const parent = scrollParent(target);
    if (!parent) return viewport;
    const rect = parent.getBoundingClientRect();
    return (
      clipBox({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }, viewport) ?? {
        ...viewport,
        width: 0,
        height: 0,
      }
    );
  }

  function outside(rect: DOMRect, visible: Box): boolean {
    return (
      rect.left < visible.left ||
      rect.top < visible.top ||
      rect.right > visible.left + visible.width ||
      rect.bottom > visible.top + visible.height
    );
  }

  // The ring has to follow its target: scrolling (any panel), resizing, the target or its container
  // changing size, fonts settling, and the first few frames while a screen animates in. Every trigger
  // only asks for one measurement on the next frame, so a scroll never measures more than it paints.
  $effect(() => {
    void step;
    void hash;

    let frame = 0;
    let burst = 0;
    let nudged = false;
    let watched: Element[] = [];
    const sizes = new ResizeObserver(() => schedule());

    function watch(target: Element | null): void {
      const next: Element[] = [];
      if (target) {
        next.push(target);
        if (target.parentElement) next.push(target.parentElement);
      }
      if (next.length === watched.length && next.every((el, i) => el === watched[i])) return;
      sizes.disconnect();
      for (const el of next) sizes.observe(el);
      watched = next;
    }

    function measure(): void {
      const current = step;
      const found = current?.target
        ? document.querySelector(
            current.place ? `[data-place="${current.target}"]` : `[data-tour="${current.target}"]`,
          )
        : null;
      const target = found instanceof Element ? found : null;
      watch(target);
      if (!target) {
        box = null;
        bounds = null;
        return;
      }
      const rect = target.getBoundingClientRect();
      const visible = visibleBounds(target);
      // Once at the step's start, bring a target below the fold into view. Smooth unless reduced motion.
      if (!nudged && (rect.width > 0 || rect.height > 0)) {
        nudged = true;
        if (outside(rect, visible)) {
          const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
          target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        }
      }
      box = targetBox(rect);
      bounds = visibleBounds(target);
    }

    function tick(): void {
      frame = 0;
      measure();
      if (burst > 0) {
        burst -= 1;
        frame = requestAnimationFrame(tick);
      }
    }

    function schedule(): void {
      if (frame === 0) frame = requestAnimationFrame(tick);
    }

    const onMove = (): void => schedule();
    addEventListener("resize", onMove);
    addEventListener("scroll", onMove, true);
    if (document.fonts) void document.fonts.ready.then(schedule);
    burst = 24;
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", onMove);
      removeEventListener("scroll", onMove, true);
      sizes.disconnect();
    };
  });

  // The card sits on the side the target is not, so it never covers what it points at. On a place it keeps
  // to the bottom left, clear of the title, and only a phone still follows the target.
  const spot = $derived(cardSpot(here, box, { width: window.innerWidth, height: window.innerHeight }));
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

{#if box && bounds && step && !step.place && !away && !blocked}
  <div
    class="ring-clip"
    aria-hidden="true"
    style="left: {bounds.left}px; top: {bounds.top}px; width: {bounds.width}px; height: {bounds.height}px"
  >
    <div
      class="ring"
      style="left: {box.left - bounds.left - 6}px; top: {box.top - bounds.top - 6}px; width: {box.width +
        12}px; height: {box.height + 12}px"
    ></div>
  </div>
{/if}

{#if box && step?.place && step.mochi && !away && !blocked}
  <div
    class="mochi-bubble"
    class:below={bubbleBelow}
    style="left: {box.left + box.width / 2}px; top: {bubbleBelow ? box.top + box.height + 8 : box.top - 8}px"
  >
    <SpriteCanvas grid={MOCHI} scale={2} />
    <span>{step.mochi}</span>
  </div>
{/if}

{#if step && !away && !blocked}
  <div
    class="card paper px tour-card"
    class:right={spot.right}
    class:top={spot.top}
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
      {#if step.allowNext || step.done === "next"}
        <button type="button" class="primary" onclick={next}>{step.nextLabel ?? "Next"}</button>
      {/if}
    </div>
  </div>
{:else if step && away && !blocked}
  <button type="button" class="card paper px tour-card back" onclick={back}
    >Ms. Juniper is waiting {waitingAt(step.at ?? "#/")}: take me back</button
  >
{/if}

{#if tip && !blocked}
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
  .card.right {
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
  .ring-clip {
    position: fixed;
    z-index: 39;
    overflow: hidden;
    pointer-events: none;
  }
  .ring {
    position: absolute;
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
    .card.right {
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
  /* The way back is a small chip, not a card, so it can sit on a screen the tour does not belong to. */
  .card.back {
    left: 16px;
    right: auto;
    bottom: 16px;
    width: auto;
    padding: 8px 12px;
    font-size: 14px;
  }
</style>
