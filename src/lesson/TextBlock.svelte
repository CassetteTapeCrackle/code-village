<script lang="ts">
  import Markdown from "./Markdown.svelte";
  let { markdown }: { markdown: string } = $props();
</script>

<div class="text"><Markdown text={markdown} /></div>

<style>
  .text :global(p) {
    margin: 0 0 28px;
  }
  .text :global(code) {
    font-family: var(--font-mono);
    color: var(--code);
  }
</style>
