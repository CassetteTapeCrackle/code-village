<script lang="ts">
  import { setupCommands } from "../net/agentSetup";
  import { api } from "../net/api";
  import { account } from "../store/account.svelte";
  import { tour } from "../tour/tour.svelte";

  type Status = { exists: boolean; createdAt: string | null };

  // The one-time agent token and the ready-made setup commands for Claude Code, Codex and opencode.
  // The token is stored hashed on the server, so it can be shown exactly once, like the recovery code.
  let open = $state(false);
  let status = $state<Status | null>(null);
  let token = $state<string | null>(null);
  let message = $state("");
  let busy = $state(false);

  $effect(() => {
    const current = account.current;
    if (!current) return;
    void load(current.token);
  });

  // The tour shows this panel when it reaches the connecting step.
  $effect(() => {
    if (tour.state.step === "connect" && !tour.state.done) open = true;
  });

  async function load(main: string): Promise<void> {
    const res = await api<Status>("/api/agent-token", { token: main });
    if (res.ok) status = res.data;
    else message = res.error;
  }

  async function make(): Promise<void> {
    const current = account.current;
    if (!current) return;
    busy = true;
    message = "";
    const res = await api<{ token: string; createdAt: string }>("/api/agent-token", {
      method: "POST",
      token: current.token,
    });
    busy = false;
    if (!res.ok) {
      message = res.error;
      return;
    }
    // the server's date, not this device's clock: the two can disagree
    status = { exists: true, createdAt: res.data.createdAt };
    token = res.data.token;
  }

  function retry(): void {
    const current = account.current;
    if (!current) return;
    message = "";
    void load(current.token);
  }

  async function revoke(): Promise<void> {
    const current = account.current;
    if (!current) return;
    busy = true;
    message = "";
    const res = await api("/api/agent-token", { method: "DELETE", token: current.token });
    busy = false;
    if (!res.ok) {
      message = res.error;
      return;
    }
    token = null;
    status = { exists: false, createdAt: null };
    message = "Revoked. Any agent using the old token is locked out.";
  }

  function copy(text: string): void {
    void navigator.clipboard?.writeText(text);
    message = "Copied.";
  }

  function copyToken(): void {
    if (token) copy(token);
  }

  const commands = $derived(token ? setupCommands(location.origin, token) : []);
</script>

<section aria-labelledby="connect-heading" data-tour="connect">
  <h3 id="connect-heading">
    <button
      type="button"
      class="fold"
      aria-expanded={open}
      aria-controls="connect-body"
      onclick={() => (open = !open)}
    >
      Connect your agent
    </button>
  </h3>

  {#if open}
    <div id="connect-body">
      {#if status}
        <p class="status">
          {status.exists
            ? `Agent token active${status.createdAt ? ` since ${status.createdAt.slice(0, 10)}` : ""}.`
            : "No agent token yet."}
        </p>
      {/if}

      {#if status}
        <div class="foot">
          {#if status.exists}
            <button type="button" class="primary" disabled={busy} onclick={make}>Make a new one</button>
            <span class="note">The old one stops working.</span>
            <button type="button" class="danger" disabled={busy} onclick={revoke}>Revoke</button>
          {:else}
            <button type="button" class="primary" disabled={busy} onclick={make}>Make an agent token</button>
          {/if}
        </div>
      {:else if message}
        <div class="foot">
          <button type="button" disabled={busy} onclick={retry}>Try again</button>
        </div>
      {/if}

      {#if token}
        <div class="code paper px">
          <p>This is the only time the token is shown. Paste it into the command for your tool.</p>
          <p class="big px">{token}</p>
          <div class="foot">
            <button type="button" class="primary" onclick={copyToken}>Copy token</button>
            <button type="button" onclick={() => (token = null)}>Done</button>
          </div>
        </div>
        {#each commands as command (command.tool)}
          <div class="command">
            <div class="h">
              <b>{command.tool}</b>
              <button
                type="button"
                onclick={() => copy(command.text)}
                aria-label={`Copy the ${command.tool} command`}>Copy</button
              >
            </div>
            <pre>{command.text}</pre>
          </div>
        {/each}
        <p>
          Your agent can read your current task, code and results. It cannot change your progress. Whether it
          gives answers is up to you.
        </p>
      {/if}

      <p aria-live="polite">{message}</p>
    </div>
  {/if}
</section>

<style>
  section {
    margin-top: 18px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 16px;
  }
  .fold {
    font: 700 16px var(--font-pixel);
    padding: 0;
    color: var(--text);
    background: none;
    border: none;
    cursor: pointer;
  }
  .fold::before {
    content: "▸ ";
    color: var(--dim);
  }
  .fold[aria-expanded="true"]::before {
    content: "▾ ";
  }
  .status {
    font-size: 14px;
    color: var(--soft);
    margin: 6px 0;
  }
  .note {
    font-size: 13px;
    color: var(--dim);
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    margin-top: 10px;
  }
  .code {
    margin: 10px 0;
    padding: 12px 16px;
  }
  .big {
    font: 700 16px var(--font-pixel);
    letter-spacing: 1px;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .command {
    margin: 10px 0;
  }
  .command .h {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 4px;
  }
  pre {
    margin: 0;
    padding: 10px 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text);
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  p {
    font-size: 14px;
    color: var(--soft);
  }
  button.danger {
    color: var(--bad);
  }
</style>
