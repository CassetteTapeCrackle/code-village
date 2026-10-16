<script lang="ts">
  // marked is about 13 KB gzip and only lesson and boss text prints markdown, so it is loaded on demand and
  // warmed with the editor while the map is idle (see prefetch.ts). A lone render node, so callers keep the
  // wrapper element and classes they had.
  let { text }: { text: string } = $props();
  let html = $state("");
  $effect(() => {
    const md = text;
    void import("marked").then(({ marked }) => (html = marked.parse(md, { async: false }) as string));
  });
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- lesson text is our own checked content -->
{@html html}
