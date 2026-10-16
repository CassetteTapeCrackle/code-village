<script lang="ts">
  import { getRunner } from "../runner/shared";

  let { message }: { message: string } = $props();
</script>

<p class="failed">
  Python could not load ({message}). Reading still works.
  <button type="button" onclick={() => getRunner().retry()}>Try loading Python again</button>
</p>

<style>
  .failed {
    color: var(--bad);
  }
  button {
    margin-left: 8px;
  }
</style>
