<script lang="ts">
  import { TROPHY_SPRITES } from "../art/trophies";
  import { bundle } from "../content/bundle";
  import { api } from "../net/api";
  import { newsLine, type PlayerCard as CardData } from "../sync/social";
  import { worldById } from "../worlds/registry";
  import { modal } from "./modal";
  import SpriteCanvas from "./SpriteCanvas.svelte";

  // One player's public card: numbers, trophies and the last few things they did.
  let { nickname, onclose }: { nickname: string; onclose: () => void } = $props();

  let card = $state<CardData | null>(null);
  let status = $state<"loading" | "ok" | "missing" | "offline">("loading");
  $effect(() => {
    const wanted = nickname;
    void api<CardData>(`/api/players/${encodeURIComponent(wanted)}`).then((res) => {
      if (res.ok) {
        card = res.data;
        status = "ok";
      } else {
        status = res.status === 0 ? "offline" : "missing";
      }
    });
  });

  // trophies arrive as names; the sprite lives on the boss's trophy id in the bundle
  function spriteFor(name: string): string | undefined {
    for (const boss of bundle.bosses) {
      if (boss.trophy.name === name) return boss.trophy.id;
      if (boss.hardTrophy.name === name) return boss.hardTrophy.id;
    }
    return undefined;
  }
  const worldName = (id: string | null): string =>
    id ? (worldById(id)?.name ?? "somewhere new") : "no lessons yet";
</script>

<div class="card paper px" role="dialog" aria-modal="true" aria-labelledby="card-heading" use:modal={onclose}>
  <h2 id="card-heading">{nickname}</h2>
  {#if status === "missing"}
    <p>No such player.</p>
  {:else if status === "offline"}
    <p>The board needs a connection. Your progress is safe on this device.</p>
  {:else if card}
    <p>
      {card.xp} XP · level {card.level} · {worldName(card.furthestWorld)} · joined {card.joined.slice(0, 10)}
    </p>
    {#if card.trophies.length}
      <ul class="trophies" aria-label="Trophies">
        {#each card.trophies as name (name)}
          {@const sprite = spriteFor(name)}
          <li>
            {#if sprite}<SpriteCanvas grid={TROPHY_SPRITES[sprite]} scale={3} />{/if}
            <span>{name}</span>
          </li>
        {/each}
      </ul>
    {:else}
      <p>No trophies yet.</p>
    {/if}
    {#if card.recent.length}
      <ul class="recent" aria-label="Recent news">
        {#each card.recent as item (item.day + item.id)}
          <li>{newsLine(item, bundle)}<span class="quiet"> {item.day}</span></li>
        {/each}
      </ul>
    {/if}
  {:else}
    <p>Loading…</p>
  {/if}
  <div class="foot"><button type="button" onclick={onclose}>Close</button></div>
</div>

<style>
  .card {
    position: fixed;
    z-index: 30;
    left: 50%;
    bottom: 96px;
    translate: -50% 0;
    width: min(92vw, 420px);
    max-height: 70vh;
    overflow: auto;
    padding: 14px 18px;
  }
  h2 {
    margin: 0 0 6px;
    font-size: 19px;
  }
  p {
    margin: 0 0 8px;
    font-size: 14px;
  }
  .trophies {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin: 8px 0;
    padding: 0;
  }
  .trophies li {
    display: flex;
    align-items: center;
    gap: 8px;
    font: 600 13px var(--font-pixel);
  }
  .recent {
    list-style: none;
    display: grid;
    gap: 5px;
    margin: 8px 0;
    padding: 0;
    font-size: 13px;
  }
  .quiet {
    color: var(--dim);
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
</style>
