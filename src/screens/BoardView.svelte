<script lang="ts">
  import { bundle } from "../content/bundle";
  import { api } from "../net/api";
  import { account } from "../store/account.svelte";
  import { newsLine, type BoardRow, type NewsItem } from "../sync/social";
  import PlayerCard from "../ui/PlayerCard.svelte";
  import Screen from "../ui/Screen.svelte";
  import { worldById } from "../worlds/registry";

  // The village board: who has reached where. Public, no token, safe to read signed out.
  let period = $state<"all" | "week">("all");
  let rows = $state<BoardRow[]>([]);
  let news = $state<NewsItem[]>([]);
  let offline = $state(false);
  let open = $state<string | null>(null);

  async function loadBoard(): Promise<void> {
    const res = await api<{ rows: BoardRow[] }>(`/api/leaderboard?period=${period}`);
    if (res.ok) {
      rows = res.data.rows;
      offline = false;
    } else if (res.status === 0) offline = true;
  }
  async function loadNews(): Promise<void> {
    const res = await api<{ items: NewsItem[] }>("/api/news");
    if (res.ok) {
      news = res.data.items;
      offline = false;
    } else if (res.status === 0) offline = true;
  }
  $effect(() => {
    void loadBoard();
  });
  $effect(() => {
    void loadNews();
  });
  $effect(() => {
    const retry = (): void => {
      void loadBoard();
      void loadNews();
    };
    addEventListener("online", retry);
    return () => removeEventListener("online", retry);
  });
  function pick(value: "all" | "week"): void {
    period = value;
  }
  const worldName = (id: string | null): string =>
    id ? (worldById(id)?.name ?? "somewhere new") : "no lessons yet";
</script>

<Screen title="Village board" here="board">
  {#if offline}
    <p>The board needs a connection. Your progress is safe on this device.</p>
  {:else}
    <div class="tabs">
      <button type="button" aria-pressed={period === "all"} onclick={() => pick("all")}>All time</button>
      <button type="button" aria-pressed={period === "week"} onclick={() => pick("week")}>This week</button>
    </div>
    {#if !account.current}
      <p><a href="#/house">Join the board from your house.</a></p>
    {/if}
    <ul class="rank" aria-label="Rankings">
      {#each rows as row, i (row.nickname)}
        <li class:me={row.nickname === account.current?.nickname}>
          <span class="place px">{i + 1}</span>
          <button type="button" class="name" onclick={() => (open = row.nickname)}>{row.nickname}</button>
          <span class="px">level {row.level}</span>
          <span class="px">{row.xp} XP</span>
          <span class="quiet">{row.lessons} lessons</span>
          <span class="quiet"
            >{row.bossesWon} bosses{row.hardWins > 0 ? ` (${row.hardWins} hard \u2605)` : ""}</span
          >
          <span class="quiet">{worldName(row.furthestWorld)}</span>
          <span class="quiet">last seen {row.lastActive}</span>
        </li>
      {/each}
    </ul>
    <h2>Village news</h2>
    <ul class="news" aria-label="Village news">
      {#each news as item, i (i)}
        <li>{newsLine(item, bundle)}<span class="quiet"> {item.day}</span></li>
      {/each}
    </ul>
  {/if}
</Screen>

{#if open}
  <PlayerCard nickname={open} onclose={() => (open = null)} />
{/if}

<style>
  .tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .tabs button[aria-pressed="true"] {
    background: var(--butter);
    color: var(--ink-dark);
  }
  .rank {
    list-style: none;
    display: grid;
    gap: 6px;
    margin: 10px 0 16px;
    padding: 0;
  }
  .rank li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 14px;
    padding: 8px 10px;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .rank li.me {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 5px var(--butter);
  }
  .place {
    font: 700 16px var(--font-pixel);
    color: var(--dim);
    width: 20px;
  }
  .name {
    padding: 0;
    font: 700 15px var(--font-pixel);
    color: var(--link);
    text-decoration: underline;
    text-underline-offset: 3px;
    background: none;
    box-shadow: none;
    clip-path: none;
    min-height: 0;
  }
  .name:active:not(:disabled) {
    padding: 0;
    box-shadow: none;
  }
  .quiet {
    color: var(--dim);
    font-size: 13px;
  }
  h2 {
    font-size: 18px;
    margin: 12px 0 6px;
  }
  .news {
    list-style: none;
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
  }
  .news li {
    font-size: 14px;
  }
</style>
