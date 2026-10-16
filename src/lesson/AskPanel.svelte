<script lang="ts">
  import type { Lesson, Task } from "../content/types";
  import { account } from "../store/account.svelte";
  import { agentPacket, CAPS, type Snapshot, type Turn } from "../tutor/packet";
  import { askTutor, OFFLINE_MESSAGE, readEvents } from "../tutor/stream";

  type Props = { lesson: Lesson; task: Task; snapshot: Snapshot };
  let { lesson, task, snapshot }: Props = $props();

  const PRIVACY_KEY = "code-village/tutor-privacy-seen";
  const PRIVACY = "Your question and code go to Cloudflare's model, which does not train on them.";
  const threadKey = $derived(`code-village/tutor/${task.id}`);

  function loadThread(): Turn[] {
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(threadKey) ?? "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (t): t is Turn =>
          typeof t === "object" &&
          t !== null &&
          ((t as Turn).role === "learner" || (t as Turn).role === "tutor") &&
          typeof (t as Turn).text === "string",
      );
    } catch {
      return [];
    }
  }

  function loadPrivacySeen(): boolean {
    try {
      return localStorage.getItem(PRIVACY_KEY) === "1";
    } catch {
      return false;
    }
  }

  let open = $state(false);
  let turns = $state<Turn[]>(loadThread());
  let draft = $state("");
  let streaming = $state(false);
  let reply = $state("");
  let notice = $state<string | null>(null);
  let copied = $state(false);
  let privacySeen = $state(loadPrivacySeen());

  const signedIn = $derived(Boolean(account.current));

  function saveThread(next: Turn[]): void {
    turns = next;
    try {
      sessionStorage.setItem(threadKey, JSON.stringify(next));
    } catch {
      // the thread stays in memory for this visit
    }
  }

  function notePrivacySeen(): void {
    privacySeen = true;
    try {
      localStorage.setItem(PRIVACY_KEY, "1");
    } catch {
      // the line simply shows again next time
    }
  }

  async function send(): Promise<void> {
    const token = account.current?.token;
    const message = draft.trim();
    if (!token || message.length === 0 || streaming) return;
    notePrivacySeen();
    const history = turns.slice(-CAPS.turns);
    saveThread([...turns, { role: "learner", text: message }]);
    draft = "";
    notice = null;
    reply = "";
    streaming = true;
    const outcome = await askTutor({ taskId: task.id, message, recentTurns: history, token });
    let answer = "";
    if (outcome.kind === "offline") {
      notice = OFFLINE_MESSAGE;
    } else if (outcome.kind === "error") {
      notice = outcome.message;
    } else {
      try {
        for await (const event of readEvents(outcome.body)) {
          if (event.kind === "text") {
            answer += event.text;
            reply = answer;
          } else if (event.kind === "error") {
            notice = event.message;
          } else {
            break;
          }
        }
      } catch {
        notice = OFFLINE_MESSAGE;
      }
    }
    // what arrived before a break is kept, and the error line stays under it
    if (answer.length > 0) saveThread([...turns, { role: "tutor", text: answer }]);
    reply = "";
    streaming = false;
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(agentPacket(lesson, task, snapshot));
      copied = true;
    } catch {
      copied = false;
    }
  }

  // replies render as text; a backtick pair inside becomes a <code> element, never HTML
  const codeParts = (text: string): string[] => text.split("`");
</script>

<div class="ask">
  <div class="row">
    {#if signedIn}
      <button type="button" onclick={() => (open = !open)} aria-expanded={open}>Ask the teacher</button>
    {:else}
      <a href="#/house">Join the board in your house to ask the teacher.</a>
    {/if}
    <button type="button" onclick={copy}>Copy for my agent</button>
    {#if copied}<span class="copied">Copied. Paste it into your agent.</span>{/if}
  </div>

  {#if open && signedIn}
    <div class="panel">
      {#if !privacySeen}<p class="privacy">{PRIVACY}</p>{/if}
      <div class="thread" aria-live="polite">
        {#each turns as turn, i (i)}
          <p class="turn" class:learner={turn.role === "learner"}>
            {#each codeParts(turn.text) as part, j (j)}{#if j % 2 === 1}<code>{part}</code
                >{:else}{part}{/if}{/each}
          </p>
        {/each}
        {#if streaming}
          <p class="turn">
            {#if reply.length > 0}
              {#each codeParts(reply) as part, j (j)}{#if j % 2 === 1}<code>{part}</code
                  >{:else}{part}{/if}{/each}
            {:else}
              <span class="waiting">The teacher is thinking...</span>
            {/if}
          </p>
        {/if}
        {#if notice}<p class="notice">{notice}</p>{/if}
      </div>
      <form
        onsubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <textarea bind:value={draft} aria-label="Your question" rows="2" placeholder="What are you stuck on?"
        ></textarea>
        <button type="submit" class="primary" disabled={streaming || draft.trim().length === 0}
          >{streaming ? "Asking..." : "Send"}</button
        >
      </form>
    </div>
  {/if}
</div>

<style>
  .ask {
    margin-top: 12px;
  }
  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }
  .copied {
    color: var(--good);
    font-size: 14px;
  }
  .panel {
    margin-top: 10px;
    padding: 10px 12px;
    background: var(--panel-2);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .privacy {
    margin: 0 0 8px;
    font-size: 14px;
    color: var(--dim);
  }
  .thread {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
  }
  .turn {
    margin: 0;
    white-space: pre-wrap;
  }
  .turn.learner {
    color: var(--soft);
  }
  .turn code {
    font-family: var(--font-mono);
    background: var(--well);
    padding: 0 4px;
  }
  .notice {
    margin: 0;
    color: var(--bad);
  }
  .waiting {
    color: var(--dim);
  }
  form {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  textarea {
    flex: 1;
  }
</style>
