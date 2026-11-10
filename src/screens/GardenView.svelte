<script lang="ts">
  import Screen from "../ui/Screen.svelte";
  import { FLOWERS } from "../art/palette";
  import { BIG_PLANTS, WATERING_CAN } from "../art/sprites";
  import { bundle, capitalise, conceptName } from "../content/bundle";
  import { today } from "../learning/dates";
  import { bedStatus, gardenBeds } from "../learning/garden";
  import { dueReviews, type ReviewItem } from "../learning/review";
  import { XP } from "../learning/xp";
  import { game } from "../store/progress.svelte";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import GardenScene from "./GardenScene.svelte";
  import ReviewSession from "./ReviewSession.svelte";

  // The garden: one line and one button for what wants water, the beds, and the plant you picked.
  // The beds already show every plant, so there is no list repeating them.
  const day = today();
  const beds = $derived(gardenBeds(bundle, game.progress, day));
  const planted = $derived(beds.filter((b) => b.plant));
  const wilting = $derived(beds.filter((b) => b.stage === "wilting").length);
  const due = $derived(dueReviews(bundle, game.progress, day));
  let chosen: string | null = $state(null);
  const selected = $derived(chosen ?? (beds.find((b) => b.due) ?? planted[0] ?? null)?.concept ?? null);
  const bed = $derived(beds.find((b) => b.concept === selected) ?? null);
  let session: ReviewItem[] | null = $state(null);

  function waterOne(concept: string): void {
    const item = due.find((d) => d.concept === concept);
    if (item) session = [item];
  }
</script>

<Screen title="Garden" here="garden">
  {#if session}
    <ReviewSession items={session} onend={() => (session = null)} />
  {:else}
    <div class="summary">
      {#if due.length > 0}
        <p>
          <b>{due.length} {due.length === 1 ? "plant wants" : "plants want"} water</b>{#if wilting}
            · {wilting} wilting{/if} <span class="each">{XP.review} XP each</span>
        </p>
        <button type="button" class="primary" onclick={() => (session = due)}
          ><SpriteCanvas grid={WATERING_CAN} scale={3} /> Start today's review ({due.length})</button
        >
      {:else if planted.length > 0}
        <p><b>Every plant is watered.</b> Come back tomorrow.</p>
      {:else}
        <p><b>Nothing planted yet.</b> Pass a lesson to plant its first seed.</p>
      {/if}
    </div>
    <GardenScene {beds} {selected} onselect={(c) => (chosen = c)} />
    {#if bed}
      <section class="info paper px" aria-live="polite">
        <div class="plant">
          <SpriteCanvas
            grid={BIG_PLANTS[bed.stage ?? "seed"]}
            scale={4}
            colors={{ f: FLOWERS[bed.region] ?? "" }}
          />
          <div>
            {#if !bed.plant}<span class="tag">not planted</span>
            {:else if bed.stage === "wilting"}<span class="tag bad">wilting</span>
            {:else if bed.due}<span class="tag warn">due today</span>
            {:else}<span class="tag good">growing</span>{/if}
            <h2>{capitalise(conceptName(bundle, bed.concept))}</h2>
            <p>{bedStatus(bed)}</p>
          </div>
        </div>
        <div class="actions">
          {#if bed.due}<button type="button" onclick={() => waterOne(bed.concept)}>Water just this one</button
            >{/if}
          <a class="btnlink px" href="#/lesson/{bed.lessonId}">Open the lesson</a>
        </div>
      </section>
    {/if}
  {/if}
</Screen>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .summary p {
    margin: 0;
    font-size: 17px;
  }
  .summary b {
    font-family: var(--font-pixel);
  }
  .each {
    color: var(--dim);
    font-size: 14px;
  }
  .info {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding: 16px 20px 18px;
  }
  .plant {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .plant h2 {
    margin: 6px 0 2px;
    font-size: 26px;
  }
  .plant p {
    margin: 0;
    color: var(--soft);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
