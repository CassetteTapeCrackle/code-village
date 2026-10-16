<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { bundle } from "../content/bundle";
  import { today } from "../learning/dates";
  import { collection } from "../learning/house";
  import { ICONS } from "../art/sprites";
  import { TROPHY_SPRITES } from "../art/trophies";
  import { ITEM_SPRITES } from "../village/destinies";
  import type { Grid } from "../art/draw";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import type { Progress } from "../learning/types";
  import { MAX_LEVEL, levelFor, xpForLevel } from "../learning/xp";
  import { game, update } from "../store/progress.svelte";
  import { exportProgress, importProgress } from "../store/storage";
  import { showOnMap } from "../ui/showme.svelte";
  import { DECOR, nextDecor } from "../village/decor";
  import { SPOTS } from "../village/layout";
  import HouseRoom from "./HouseRoom.svelte";
  import ProfilePanel from "../ui/ProfilePanel.svelte";

  // The house: your finds in the room, one line of numbers, the shelf of what you found, and the village's growth
  // as a level track (one node per level, the next one named once). Backups sit quietly at the foot.
  const level = $derived(levelFor(game.progress.xp));
  const slots = $derived(collection(bundle, game.progress));
  const found = $derived(slots.filter((sl) => sl.found));
  const top = Math.max(...DECOR.map((d) => d.level));
  const next = $derived(nextDecor(level));
  const built = $derived(DECOR.filter((d) => d.level <= level).length);
  const towardNext = $derived(
    Math.round((100 * (game.progress.xp - xpForLevel(level))) / (xpForLevel(level + 1) - xpForLevel(level))),
  );
  let node: number | null = $state(null);
  // each trophy and item with its own sprite; trophies are 12 pixels, items 7, so they get different scales
  const iconFor = (id: string, kind: string): Grid =>
    kind === "trophy" ? (TROPHY_SPRITES[id] ?? ICONS.star) : (ITEM_SPRITES[id] ?? ICONS.sprout);

  let pending: Progress | null = $state(null);
  let message = $state("");
  function download(): void {
    const text = exportProgress($state.snapshot(game.progress) as Progress);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `code-village-${today()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function pick(event: Event & { currentTarget: HTMLInputElement }): Promise<void> {
    const chosen = event.currentTarget.files?.[0];
    if (!chosen) return;
    const result = importProgress(await chosen.text());
    pending = result.ok ? result.progress : null;
    message = result.ok ? "" : result.error;
  }
  function replace(): void {
    const next = pending;
    if (!next) return;
    update(() => next);
    pending = null;
    message = "Save loaded.";
  }
</script>

<Screen title="Your house" here="house">
  <HouseRoom
    loot={found.filter((sl) => sl.kind === "loot").map((sl) => sl.id)}
    trophies={found.filter((sl) => sl.kind === "trophy").map((sl) => sl.id)}
  />
  <ul class="stats" aria-label="Stats">
    <li class="px"><b>{level}</b> level</li>
    <li class="px"><b>{game.progress.xp}</b> XP</li>
    <li class="px"><b>{Object.keys(game.progress.lessons).length}/{bundle.lessons.length}</b> lessons</li>
    <li class="px">
      <b>{bundle.bosses.filter((b) => game.progress.bosses[b.id]?.wonAt).length}/{bundle.bosses.length}</b> bosses
    </li>
    <li class="px">
      <b>{Object.values(game.progress.plants).filter((pl) => pl.stage >= 2).length}</b> in bloom
    </li>
  </ul>

  <section aria-labelledby="loot-heading">
    <div class="h">
      <h2 id="loot-heading">Shelf</h2>
      <span class="meta">{found.length} of {slots.length} found</span>
    </div>
    <ul class="shelf">
      {#each found as slot (slot.id)}
        <li class="item px" class:trophy={slot.kind === "trophy"}>
          <SpriteCanvas grid={iconFor(slot.id, slot.kind)} scale={slot.kind === "trophy" ? 3 : 5} />
          <span>{slot.name}{slot.kind === "trophy" ? " (trophy)" : ""}</span>
        </li>
      {/each}
      {#if found.length < slots.length}
        <li class="item rest px">
          <span
            >{slots.length - found.length} still out there.<br />Lessons leave loot, bosses leave trophies.</span
          >
        </li>
      {/if}
    </ul>
  </section>

  <section aria-labelledby="decor-heading">
    <div class="h">
      <h2 id="decor-heading">Village growth</h2>
      <span class="meta">{built} of {DECOR.length} built</span>
    </div>
    <div class="track" style="--done: {((Math.min(level, top) - 1) / (top - 1)) * 100}%">
      {#each Array.from({ length: top }, (_, i) => i + 1) as n (n)}
        {@const count = DECOR.filter((d) => d.level === n).length}
        <button
          type="button"
          class="node"
          class:got={n <= level}
          class:here={n === level}
          aria-expanded={node === n}
          aria-label="Level {n}: {n === 1 ? 'where every village starts' : `${count} new`}"
          onclick={() => (node = node === n ? null : n)}
        >
          <i class="px">{n}</i><span aria-hidden="true">{n === 1 ? "start" : count}</span>
        </button>
      {/each}
    </div>
    {#if node}
      <div class="node-pop paper px">
        <h3>Level {node}{node <= level ? " · built" : " · later"}</h3>
        {#if node === 1}
          <p>Where every village starts: a school, a library, a garden and your house.</p>
        {:else}
          <ul>
            {#each DECOR.filter((d) => d.level === node) as d (d.id)}
              <li>
                <span>{d.name}</span>
                {#if node <= level && SPOTS[d.id]}<button
                    type="button"
                    class="small"
                    onclick={() => showOnMap(SPOTS[d.id], d.name, "#/house", "Back to your house")}
                    >Show me</button
                  >{/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    {#if next}
      <div class="next px">
        <span>Next, at <b>level {next.level}</b>: {next.name}.</span>
        <small>{xpForLevel(next.level) - game.progress.xp} XP to go</small>
        <div class="mini" aria-hidden="true">
          <i style="width: {next.level === level + 1 ? towardNext : 0}%"></i>
        </div>
      </div>
    {:else if level === MAX_LEVEL}
      <div class="next px"><span><b>Max level reached.</b> The whole village is built.</span></div>
    {/if}
  </section>

  <ProfilePanel />

  <section class="backup" aria-labelledby="backup-heading">
    <h2 id="backup-heading" class="sr-only">Backup</h2>
    {#if !game.persistent}<p class="warn">
        This browser is not keeping your progress. Download it to keep it.
      </p>{/if}
    <div class="foot">
      <span aria-hidden="true">Backup</span>
      <button type="button" class="quiet" onclick={download}>Download my progress</button>
      <label class="quiet load"
        >Load a save file <input
          class="sr-only"
          type="file"
          accept=".json,application/json"
          onchange={pick}
        /></label
      >
    </div>
    {#if pending}
      <p>
        This save has {pending.xp} XP and {Object.keys(pending.lessons).length} lesson(s) passed. It replaces your
        current progress ({game.progress.xp} XP).
      </p>
      <div class="foot">
        <button type="button" class="primary" onclick={replace}>Replace my progress</button>
        <button type="button" onclick={() => (pending = null)}>Cancel</button>
      </div>
    {/if}
    <p aria-live="polite">{message}</p>
  </section>
</Screen>

<style>
  section {
    margin-top: 18px;
  }
  .h {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .meta {
    color: var(--dim);
    font-size: 14px;
  }
  .stats {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 14px 0 0;
    padding: 0;
  }
  .stats li {
    --c: 2px;
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 5px 10px 6px;
    font-size: 13px;
    color: var(--soft);
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .stats b {
    font: 700 17px var(--font-pixel);
    color: var(--text);
  }
  .shelf {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 8px;
  }
  .item {
    --c: 3px;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 6px;
    min-height: 96px;
    padding: 8px 4px;
    font: 600 12px/1.15 var(--font-pixel);
    text-align: center;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .item.trophy {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 5px var(--butter);
  }
  .item.rest {
    grid-column: span 2;
    color: var(--dim);
    font-weight: 400;
    background: transparent;
    box-shadow: inset 0 0 0 2px var(--paper-line);
  }
  .track {
    position: relative;
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    padding-top: 4px;
  }
  .track::before,
  .track::after {
    content: "";
    position: absolute;
    top: 22px;
    left: 4.5%;
    height: 6px;
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .track::before {
    right: 4.5%;
    background: var(--paper-2);
  }
  .track::after {
    width: calc(var(--done) * 0.91);
    background: var(--matcha);
  }
  .node {
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    gap: 6px;
    min-height: 0;
    padding: 0;
    font: 400 12px var(--font-pixel);
    color: var(--dim);
    background: none;
    box-shadow: none;
    clip-path: none;
  }
  .node:active:not(:disabled) {
    padding: 0;
    box-shadow: none;
  }
  .node i {
    --c: 2px;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    font: 700 14px var(--font-pixel);
    font-style: normal;
    color: var(--text);
    background: var(--paper);
    box-shadow: inset 0 0 0 3px var(--outline);
    clip-path: polygon(
      2px 0,
      calc(100% - 2px) 0,
      100% 2px,
      100% calc(100% - 2px),
      calc(100% - 2px) 100%,
      2px 100%,
      0 calc(100% - 2px),
      0 2px
    );
  }
  .node.got i {
    background: var(--matcha);
    color: var(--ink-dark);
  }
  .node.here i {
    background: var(--butter);
    color: var(--ink-dark);
  }
  .node.got span {
    color: var(--text);
  }
  .node[aria-expanded="true"] i {
    box-shadow:
      inset 0 0 0 3px var(--outline),
      inset 0 0 0 6px var(--paper);
  }
  .node:focus-visible {
    outline: 3px solid var(--link);
    outline-offset: 2px;
  }
  .node-pop {
    margin-top: 12px;
    padding: 12px 16px;
  }
  .node-pop h3 {
    margin: 0 0 6px;
    font-size: 15px;
  }
  .node-pop p {
    margin: 0;
  }
  .node-pop ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .node-pop li {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 34px;
  }
  .node-pop li button {
    margin-left: auto;
  }
  button.small {
    min-height: 32px;
    padding: 0 12px 3px;
    font-size: 14px;
  }
  .next {
    --c: 3px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px 14px;
    align-items: center;
    margin-top: 12px;
    padding: 12px 14px;
    background: color-mix(in srgb, var(--butter) 38%, var(--paper));
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .next small {
    color: var(--soft);
    font-size: 13px;
  }
  .mini {
    grid-column: 1 / -1;
    position: relative;
    height: 8px;
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .mini i {
    position: absolute;
    inset: 2px auto 2px 2px;
    max-width: calc(100% - 4px);
    background: var(--butter-2);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    font-size: 14px;
    color: var(--dim);
  }
  .quiet {
    min-height: 32px;
    padding: 0;
    font: 400 14px var(--font-pixel);
    color: var(--link);
    text-decoration: underline;
    text-underline-offset: 3px;
    background: none;
    box-shadow: none;
    clip-path: none;
    cursor: pointer;
  }
  .quiet:active:not(:disabled) {
    padding: 0;
    box-shadow: none;
  }
  .load:focus-within {
    outline: 3px solid var(--link);
    outline-offset: 2px;
  }
  .warn {
    color: var(--bad);
  }
  @media (max-width: 560px) {
    .node span {
      display: none;
    }
    .node i {
      width: 24px;
      height: 24px;
      font-size: 11px;
    }
    .track::before,
    .track::after {
      top: 14px;
    }
  }
</style>
