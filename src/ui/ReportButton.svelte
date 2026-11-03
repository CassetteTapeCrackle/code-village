<script lang="ts">
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
  let attempt = $state(0);
  let widget: HTMLElement | undefined = $state(undefined);

  $effect(() => {
    const element = widget;
    if (!element) return;
    renderTurnstile(element)
      .then((t) => (token = t))
      .catch((error: unknown) => {
        notice = error instanceof Error ? error.message : "The human check failed. Try again.";
      });
  });

  function open(): void {
    stage = "open";
    notice = "";
  }

  async function send(): Promise<void> {
    if (!token) {
      notice = "The human check is still loading. Give it a second and try again.";
      return;
    }
    stage = "sending";
    const report: ReportRequest = { kind: "button", item, code, turnstile: token };
    const trimmed = message.trim();
    if (trimmed) report.message = trimmed;
    const res = await sendReport(report);
    if (res.ok) {
      stage = "sent";
      message = "";
      return;
    }
    // a Turnstile token works once, so a retry needs a fresh widget
    token = "";
    attempt += 1;
    stage = "open";
    notice = res.error;
  }
</script>

<div class="report">
  {#if stage === "closed" || stage === "sent"}
    <button type="button" class="report-open" onclick={open}>Report a problem</button>
    {#if stage === "sent"}<p class="sent" role="status">Thanks. We will look at it.</p>{/if}
  {:else}
    <label class="field">
      <span>What looks wrong? (optional)</span>
      <textarea rows="3" maxlength={MAX_REPORT_MESSAGE_CHARS} bind:value={message}></textarea>
    </label>
    <p class="what">We send this page's id, your code and your message. No nickname.</p>
    {#key attempt}<div bind:this={widget}></div>{/key}
    <div class="actions">
      <button type="button" class="primary" onclick={send} disabled={stage === "sending"}>Send report</button>
      <button type="button" onclick={() => (stage = "closed")}>Cancel</button>
    </div>
    {#if notice}<p class="notice" role="alert">{notice}</p>{/if}
  {/if}
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
  .sent {
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
