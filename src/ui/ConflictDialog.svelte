<script lang="ts">
  // The one question the sync asks when this device and the cloud disagree. Mounted globally, so a
  // conflict found by the timer on any screen still reaches the learner.
  import { resolveConflict, syncConflict } from "../store/sync.svelte";
  import { modal } from "./modal";
</script>

{#if syncConflict.current}
  <div
    class="conflict paper px"
    role="dialog"
    aria-modal="true"
    aria-labelledby="conflict-heading"
    use:modal={() => {}}
  >
    <h2 id="conflict-heading">This device and the cloud disagree.</h2>
    <p>Keep which progress?</p>
    {#if syncConflict.error}
      <p class="bad">{syncConflict.error}</p>
    {/if}
    <div class="foot">
      <button type="button" class="primary" onclick={() => void resolveConflict("device")}>This device</button
      >
      <button type="button" onclick={() => void resolveConflict("cloud")}>The cloud</button>
    </div>
  </div>
{/if}

<style>
  .conflict {
    position: fixed;
    z-index: 30;
    left: 50%;
    bottom: 96px;
    translate: -50% 0;
    width: min(92vw, 420px);
    padding: 14px 18px;
  }
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  p {
    margin: 0;
    font-size: 15px;
  }
  .bad {
    color: var(--bad);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
</style>
