<script lang="ts">
  import { AREAS } from "../village/areas";
  import { worldById } from "../worlds/registry";
  import Screen from "./Screen.svelte";

  // What a locked world's screens show: the road is not open yet, and the hint for opening it.
  let { world }: { world: string } = $props();
  const known = $derived(worldById(world));
  const hint = $derived(AREAS.find((a) => a.world === world)?.hint ?? "");
</script>

{#if known}
  <Screen title="The road is still blocked">
    <div class="card paper px">
      <h2>{known.name} is not open yet</h2>
      <p>{hint}</p>
      <p>Beat the last boss of the world before it to clear the way.</p>
      <a class="btnlink primary px" href="#/">Back to the village</a>
    </div>
  </Screen>
{:else}
  <Screen title="Nothing here">
    <div class="card paper px">
      <h2>This place does not exist</h2>
      <p>Maybe the link has a typo. The village is still where you left it.</p>
      <a class="btnlink primary px" href="#/">Back to the village</a>
    </div>
  </Screen>
{/if}

<style>
  .card {
    padding: 18px 20px;
    display: grid;
    gap: 10px;
    justify-items: start;
  }
  h2,
  p {
    margin: 0;
  }
</style>
