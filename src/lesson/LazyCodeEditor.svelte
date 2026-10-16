<script lang="ts">
  import type { Component } from "svelte";

  type EditorProps = { value: string; label: string; onchange: (code: string) => void };
  let { value, label, onchange }: EditorProps = $props();
  // CodeMirror and Lezer are about 143 KB gzip between them, so the editor loads on demand; the map warms it
  // while idle (see prefetch.ts). A plain code area of the same size stands in for the moment that takes.
  let Editor = $state<Component<EditorProps> | null>(null);
  $effect(() => {
    void import("./CodeEditor.svelte").then((m) => (Editor = m.default));
  });
</script>

{#if Editor}
  <Editor {value} {label} {onchange} />
{:else}
  <div class="editor">
    <pre class="stand-in">{value.trimEnd()}</pre>
  </div>
{/if}

<style>
  .editor {
    background: var(--well);
    font-size: 14px;
  }
  /* the same box the editor fills: the wrapper's min-height is what the editor's own rule reads */
  .stand-in {
    min-height: var(--editor-min, 120px);
    margin: 0;
    padding: 4px 0;
    overflow: hidden;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.4;
    white-space: pre;
  }
</style>
