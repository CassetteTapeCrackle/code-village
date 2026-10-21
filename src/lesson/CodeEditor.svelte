<script lang="ts">
  import { acceptCompletion } from "@codemirror/autocomplete";
  import { indentWithTab } from "@codemirror/commands";
  import { python } from "@codemirror/lang-python";
  import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
  import { tags as t } from "@lezer/highlight";
  import { Prec } from "@codemirror/state";
  import { EditorView, keymap } from "@codemirror/view";
  import { basicSetup } from "codemirror";
  import { onMount } from "svelte";

  let { value, label, onchange }: { value: string; label: string; onchange: (code: string) => void } =
    $props();
  let host: HTMLDivElement;

  // Syntax colours from the palette tokens, so code reads well by day and by night.
  const highlight = HighlightStyle.define([
    {
      tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword],
      color: "var(--code-kw)",
      fontWeight: "600",
    },
    {
      tag: [t.function(t.variableName), t.function(t.definition(t.variableName)), t.className],
      color: "var(--code-fn)",
    },
    { tag: [t.string, t.special(t.string)], color: "var(--code-str)" },
    { tag: [t.number, t.bool, t.null], color: "var(--code-num)" },
    { tag: t.comment, color: "var(--code-comment)", fontStyle: "italic" },
  ]);
  const look = EditorView.theme({
    "&": { color: "var(--text)", backgroundColor: "var(--well)" },
    ".cm-scroller": { fontFamily: "var(--font-mono)" },
    ".cm-content": { caretColor: "var(--text)" },
    ".cm-cursor": { borderLeftColor: "var(--text)" },
    ".cm-gutters": { backgroundColor: "var(--panel-2)", color: "var(--dim)", border: "none" },
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--line) 35%, transparent)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--line)", color: "var(--text)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "color-mix(in srgb, var(--link) 30%, transparent)",
    },
  });

  // The first time the editor gets focus, select a lone `pass` placeholder so typing replaces it.
  function selectPlaceholder(view: EditorView): void {
    const at = view.state.doc.toString().search(/^[ \t]*pass[ \t]*$/m);
    if (at < 0) return;
    const line = view.state.doc.lineAt(at);
    const from = line.from + line.text.indexOf("pass");
    view.dispatch({ selection: { anchor: from, head: from + 4 } });
  }

  onMount(() => {
    let placeholderOffered = false;
    const view = new EditorView({
      // No trailing blank line: it invites typing outside the function, and its extra line would make
      // the editor taller than the stand-in that reserved its box while this chunk loaded.
      doc: value.trimEnd(),
      parent: host,
      extensions: [
        // Tab accepts a suggestion, otherwise indents; Escape then Tab still leaves the editor
        Prec.high(keymap.of([{ key: "Tab", run: acceptCompletion }, indentWithTab])),
        basicSetup,
        python(),
        indentUnit.of("    "), // Python's four spaces
        EditorView.domEventHandlers({
          focus: (_, v) => {
            if (placeholderOffered) return;
            placeholderOffered = true;
            const doc = v.state.doc;
            // only if the learner has not typed, selected or pasted in the meantime
            requestAnimationFrame(() => {
              if (v.state.doc === doc && v.state.selection.main.empty) selectPlaceholder(v);
            });
          },
        }),
        syntaxHighlighting(highlight),
        look,
        EditorView.contentAttributes.of({
          "aria-label": `${label}. Tab indents; press Escape then Tab to leave the editor.`,
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onchange(u.state.doc.toString());
        }),
      ],
    });
    return () => view.destroy();
  });
</script>

<div class="editor" bind:this={host}></div>

<style>
  .editor {
    background: var(--well);
    font-size: 14px;
  }
  .editor :global(.cm-editor) {
    min-height: var(--editor-min, 120px); /* the placeholder in LazyCodeEditor reads the same variable */
  }
  .editor :global(.cm-focused) {
    outline: 2px solid var(--link);
  }
</style>
