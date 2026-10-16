<script lang="ts">
  import { MOCHI } from "../art/sprites";
  import { bundle } from "../content/bundle";
  import { bossOpen } from "../learning/access";
  import { bossState } from "../learning/boss";
  import { today } from "../learning/dates";
  import { dueReviews } from "../learning/review";
  import { game } from "../store/progress.svelte";
  import SpriteCanvas from "./SpriteCanvas.svelte";
  import { openWorlds } from "../worlds/registry";

  // What to do next: pinned on the map, and hanging from the plank everywhere else.
  // only worlds whose road is open count: a locked world's lessons are not next yet
  const open = $derived(openWorlds(bundle, game.progress));
  const lessons = $derived(bundle.lessons.filter((l) => open.includes(l.world)));
  const next = $derived(lessons.find((l) => !game.progress.lessons[l.id]) ?? null);
  const due = $derived(dueReviews(bundle, game.progress, today()).length);
  const awake = $derived(
    bundle.bosses.find(
      (b) =>
        open.includes(b.world) && bossOpen(bundle, game.progress, b) && !bossState(game.progress, b.id).wonAt,
    ) ?? null,
  );
</script>

<section class="card paper px">
  <h2><SpriteCanvas grid={MOCHI} scale={2} /> Today</h2>
  <ul class="todo">
    {#if next}<li><a href="#/lesson/{next.id}">Learn: {next.title}</a></li>{/if}
    {#if due > 0}<li><a href="#/garden">Water {due} {due === 1 ? "plant" : "plants"}</a></li>{/if}
    {#if awake}<li><a href="#/boss/{awake.id}">Face {awake.title}</a></li>{/if}
    {#if !next && due === 0 && !awake}<li class="done">All done for today. Mochi approves.</li>{/if}
  </ul>
</section>

<style>
  .card {
    padding: 14px 16px;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 10px;
    font-size: 18px;
  }
  .todo {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .todo a {
    display: block;
    padding: 8px 10px;
    font: 700 15px var(--font-pixel);
    color: var(--text);
    text-decoration: none;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .todo a::before {
    content: "> " / "";
    color: var(--coral-2);
  }
  .todo a:hover {
    background: var(--butter);
    color: var(--ink-dark);
  }
  .done {
    font-size: 15px;
    color: var(--soft);
  }
</style>
