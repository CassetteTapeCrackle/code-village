<script lang="ts">
  import { tick } from "svelte";
  import { sendReport, type ReportRequest } from "../net/api";
  import { MAX_REPORT_MESSAGE_CHARS } from "../sync/events";
  import { renderTurnstile } from "./turnstile";

  // "Report a problem" for one lesson or task: the learner's message and current code go to the
  // worker, which files them for the owner. The human check loads only once the form opens.
  type Props = { item: string; code: string };
  let { item, code }: Props = $props();

  type Stage = "closed" | "open" | "sending" | "sent";
  let stage: Stage = $state("closed");
  let message = $state("");
  let notice = $state("");
  let token = $state("");
  let checkFailed = $state(false);
  let attempt = $state(0);
  let widget: HTMLElement | undefined = $state(undefined);
  let openButton: HTMLButtonElement | undefined = $state(undefined);
  let field: HTMLTextAreaElement | undefined = $state(undefined);
  let renders = 0;

  $effect(() => {
    const element = widget;
    if (!element) return;
    // a widget replaced by a newer one must not hand in its token late
    const mine = ++renders;
    renderTurnstile(element)
      .then((t) => {
        if (mine === renders) token = t;
      })
      .catch((error: unknown) => {
        if (mine !== renders) return;
        checkFailed = true;
        notice = error instanceof Error ? error.message : "The human check failed. Try again.";
      });
  });

  // a Turnstile token works once, so every new try needs a fresh widget
  function freshCheck(): void {
    token = "";
    checkFailed = false;
    attempt += 1;
  }

  async function open(): Promise<void> {
    stage = "open";
    notice = "";
    await tick();
    field?.focus();
  }

  async function close(next: "closed" | "sent"): Promise<void> {
    stage = next;
    freshCheck();
    await tick();
    openButton?.focus();
  }

  function retryCheck(): void {
    notice = "";
    freshCheck();
  }

  async function send(): Promise<void> {
    if (!token) {
      if (!checkFailed) notice = "The human check is still loading. Give it a second and try again.";
      return;
    }
    stage = "sending";
    const report: ReportRequest = { kind: "button", item, code, turnstile: token };
    const trimmed = message.trim();
    if (trimmed) report.message = trimmed;
    const res = await sendReport(report);
    if (res.ok) {
      message = "";
      await close("sent");
      return;
    }
    freshCheck();
    stage = "open";
    notice = res.error;
  }
</script>

<div class="report">
  {#if stage === "closed" || stage === "sent"}
    <button type="button" class="report-open" bind:this={openButton} onclick={open}>Report a problem</button>
  {:else}
    <label class="field">
      <span>What looks wrong? (optional)</span>
      <textarea rows="3" maxlength={MAX_REPORT_MESSAGE_CHARS} bind:this={field} bind:value={message}
      ></textarea>
    </label>
    <p class="what">
      We send this page's id{code ? ", your code" : ""} and your message, with no nickname. Please leave out personal
      details.
    </p>
    {#key attempt}<div bind:this={widget}></div>{/key}
    <div class="actions">
      <button type="button" class="primary" onclick={send} disabled={stage === "sending"}>Send report</button>
      {#if checkFailed}
        <button type="button" onclick={retryCheck}>Try the human check again</button>
      {/if}
      <button type="button" onclick={() => close("closed")} disabled={stage === "sending"}>Cancel</button>
    </div>
    {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
  {/if}
  <p class="sent" role="status">{stage === "sent" ? "Thanks. We will look at it." : ""}</p>
</div>

<style>
  .report {
    margin-top: 12px;
  }
  .report-open {
    font-size: 14px;
  }
  .field {
    display: grid;
    gap: 4px;
  }
  .field span {
    font: 600 15px var(--font-pixel);
  }
  .field textarea {
    padding: 8px 10px;
    border: 0;
    resize: vertical;
    background: var(--well);
    color: var(--text);
    box-shadow: inset 0 0 0 2px var(--outline);
    font-size: 14px;
  }
  .field textarea:focus-visible {
    outline: none;
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 0 0 0 4px var(--butter);
  }
  .what,
  .sent:not(:empty) {
    margin: 6px 0;
    color: var(--dim);
    font-size: 14px;
  }
  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .notice {
    color: var(--bad);
  }
</style>
