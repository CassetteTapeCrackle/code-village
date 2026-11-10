<script lang="ts">
  import type { Progress } from "../learning/types";
  import { api } from "../net/api";
  import { account, setRevision, signIn, signOut } from "../store/account.svelte";
  import { game, update } from "../store/progress.svelte";
  import { backfill, flushNow, syncConflict } from "../store/sync.svelte";
  import { unpackSave } from "../store/storage";
  import { tourEvent, tour } from "../tour/tour.svelte";
  import ConnectPanel from "./ConnectPanel.svelte";
  import { modal } from "./modal";
  import { renderTurnstile } from "./turnstile";

  // The village board identity for this browser: join or recover when signed out, who you are and the way
  // out when signed in. The recovery code is shown exactly once, so Done is a real decision.
  const NICKNAME = /^[A-Za-z0-9_-]{3,20}$/;
  // A down Worker: no response at all (status 0), or the dev proxy's 500/502/504 standing in for it.
  const unreachable = (status: number): boolean => status === 0 || status >= 500;
  const BOARD_DOWN = "The village board can't be reached right now. Try again in a moment.";

  let nickname = $state("");
  let codeInput = $state("");
  let message = $state("");
  let busy = $state(false);
  let recoveryShown = $state<string | null>(null);
  let confirmDelete = $state(false);
  let joinToken = $state("");
  let recoverToken = $state("");
  let joinAttempt = $state(0);
  let recoverAttempt = $state(0);
  let joinFailed = $state(false);
  let joinWidget: HTMLElement | undefined = $state(undefined);
  let recoverWidget: HTMLElement | undefined = $state(undefined);

  $effect(() => {
    const widget = joinWidget;
    if (!widget || account.current) return;
    renderTurnstile(widget)
      .then((token) => {
        joinToken = token;
        joinFailed = false;
      })
      .catch((error: unknown) => {
        joinFailed = true;
        message = error instanceof Error ? error.message : "The human check failed. Try again.";
      });
  });
  $effect(() => {
    const widget = recoverWidget;
    if (!widget || account.current) return;
    renderTurnstile(widget)
      .then((token) => (recoverToken = token))
      .catch(
        (error: unknown) =>
          (message = error instanceof Error ? error.message : "The human check failed. Try again."),
      );
  });

  async function join(): Promise<void> {
    message = "";
    const wanted = nickname.trim();
    if (!NICKNAME.test(wanted)) {
      message = "Use 3 to 20 letters, digits, - or _.";
      return;
    }
    if (!joinToken) {
      message = "The human check is still loading. Give it a second and try again.";
      return;
    }
    busy = true;
    const res = await api<{ nickname: string; token: string; recoveryCode: string }>("/api/register", {
      method: "POST",
      body: { nickname: wanted, turnstile: joinToken },
    });
    busy = false;
    if (!res.ok) {
      message = unreachable(res.status) ? BOARD_DOWN : res.error;
      joinToken = "";
      joinAttempt += 1;
      return;
    }
    signIn({ nickname: res.data.nickname, token: res.data.token, revision: 0 });
    backfill($state.snapshot(game.progress) as Progress);
    void flushNow();
    recoveryShown = res.data.recoveryCode;
    nickname = "";
    tourEvent("join-board");
  }

  async function recover(): Promise<void> {
    message = "";
    if (!recoverToken) {
      message = "The human check is still loading. Give it a second and try again.";
      return;
    }
    if (!codeInput.trim()) {
      message = "Type the recovery code you wrote down.";
      return;
    }
    busy = true;
    const res = await api<{ nickname: string; token: string }>("/api/recover", {
      method: "POST",
      body: { recoveryCode: codeInput.trim(), turnstile: recoverToken },
    });
    busy = false;
    if (!res.ok) {
      message = unreachable(res.status) ? BOARD_DOWN : res.error;
      recoverToken = "";
      recoverAttempt += 1;
      return;
    }
    signIn({ nickname: res.data.nickname, token: res.data.token, revision: 0 });
    codeInput = "";
    const save = await api<{ revision: number; blob: string | null }>("/api/save", { token: res.data.token });
    if (!save.ok || save.data.revision === 0 || save.data.blob === null) {
      // nothing in the cloud: this device's own history goes up
      backfill($state.snapshot(game.progress) as Progress);
      void flushNow();
      return;
    }
    if (game.progress.xp === 0) {
      const imported = await unpackSave(save.data.blob);
      if (!imported.ok) {
        // keep the revision at 0: a flush must draw a 409, never overwrite the newer cloud save
        message = imported.error;
        return;
      }
      update(() => imported.progress);
      setRevision(save.data.revision);
    } else {
      syncConflict.current = { revision: save.data.revision, blob: save.data.blob };
      syncConflict.error = null;
    }
  }

  async function deleteMe(): Promise<void> {
    const current = account.current;
    if (!current) return;
    busy = true;
    const res = await api("/api/me", { method: "DELETE", token: current.token });
    busy = false;
    confirmDelete = false;
    if (res.ok) signOut();
    else message = res.error;
  }

  function copyCode(): void {
    if (!recoveryShown) return;
    void navigator.clipboard?.writeText(recoveryShown);
    message = "Copied.";
  }

  // a fresh widget element runs the human check again after the script or the check failed
  function retryJoin(): void {
    joinFailed = false;
    joinToken = "";
    message = "";
    joinAttempt += 1;
  }
</script>

<section aria-labelledby="board-heading" data-tour="profile">
  <div class="h">
    <h2 id="board-heading">{account.current ? "Village board" : "Join the village board"}</h2>
    <span class="meta">{account.current ? account.current.nickname : "no nickname yet"}</span>
  </div>

  {#if recoveryShown}
    <div class="code paper px" data-tour="recovery">
      <p>
        Write this down. It is the only way back to your nickname on a new device or after clearing the
        browser.
      </p>
      <p class="big px">{recoveryShown}</p>
      {#if tour.state.step === "recovery" && !tour.state.done}
        <label class="saved">
          <input type="checkbox" onchange={(e) => e.currentTarget.checked && tourEvent("recovery")} /> I saved it
          somewhere
        </label>
      {/if}
      <div class="foot">
        <button type="button" class="primary" onclick={copyCode}>Copy</button>
        <button type="button" onclick={() => (recoveryShown = null)}>Done</button>
      </div>
    </div>
  {/if}

  {#if account.current}
    <p>Signed in as <b>{account.current.nickname}</b>.</p>
    <div class="foot">
      <button type="button" onclick={() => signOut()}>Sign out on this device</button>
      <button type="button" class="danger" onclick={() => (confirmDelete = true)}>Delete me</button>
    </div>
    <ConnectPanel />
  {:else}
    <p>Your nickname is shown to everyone. Use a nickname, not your real name.</p>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void join();
      }}
    >
      <label>Nickname <input bind:value={nickname} maxlength="20" autocomplete="off" /></label>
      {#key joinAttempt}<div class="widget" bind:this={joinWidget}></div>{/key}
      <button type="submit" class="primary" disabled={busy}>Join</button>
      {#if joinFailed}
        <button type="button" onclick={retryJoin}>Try again</button>
      {/if}
    </form>
    <h3>Already joined on another device?</h3>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        void recover();
      }}
    >
      <label>Recovery code <input bind:value={codeInput} autocomplete="off" /></label>
      {#key recoverAttempt}<div class="widget" bind:this={recoverWidget}></div>{/key}
      <button type="submit" disabled={busy}>Recover</button>
    </form>
  {/if}

  <p aria-live="polite">{message}</p>

  {#if confirmDelete}
    <div
      class="confirm paper px"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-heading"
      use:modal={() => (confirmDelete = false)}
    >
      <h3 id="delete-heading">Delete your nickname?</h3>
      <p>
        This removes your nickname, your place on the board and your cloud save. Your progress on this device
        stays.
      </p>
      <div class="foot">
        <button type="button" class="primary" onclick={deleteMe}>Yes, delete me</button>
        <button type="button" onclick={() => (confirmDelete = false)}>Cancel</button>
      </div>
    </div>
  {/if}
</section>

<style>
  section {
    margin-top: 18px;
  }
  .h {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  h3 {
    margin: 16px 0 6px;
    font-size: 16px;
  }
  .meta {
    color: var(--dim);
    font-size: 14px;
  }
  p {
    font-size: 14px;
    color: var(--soft);
  }
  form {
    display: grid;
    gap: 8px;
    justify-items: start;
    margin: 10px 0 0;
  }
  label {
    display: grid;
    gap: 4px;
    font-size: 14px;
    color: var(--soft);
  }
  input {
    font: 400 15px var(--font-pixel);
    padding: 6px 8px;
    color: var(--text);
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--outline);
    border: none;
  }
  .widget {
    min-height: 66px;
  }
  .code {
    margin: 10px 0;
    padding: 12px 16px;
  }
  .big {
    font: 700 20px var(--font-pixel);
    letter-spacing: 1px;
    color: var(--text);
  }
  .saved {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 8px;
    font-size: 14px;
  }
  .foot {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    margin-top: 10px;
  }
  button.danger {
    color: var(--bad);
  }
  .confirm {
    position: fixed;
    z-index: 30;
    left: 50%;
    bottom: 96px;
    translate: -50% 0;
    width: min(92vw, 420px);
    padding: 14px 18px;
  }
</style>
