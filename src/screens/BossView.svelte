<script lang="ts">
  import { untrack } from "svelte";
  import Screen from "../ui/Screen.svelte";
  import { modal } from "../ui/modal";
  import Markdown from "../lesson/Markdown.svelte";
  import { bundle } from "../content/bundle";
  import type { Boss } from "../content/types";
  import { bossOpen, hardOpen } from "../learning/access";
  import { applySkip } from "../learning/skip";
  import {
    bossHp,
    bossState,
    hardChecksLeft,
    newHardAttempt,
    passStages,
    recordHardCheck,
    rematchBoss,
    winHard,
  } from "../learning/boss";
  import { today } from "../learning/dates";
  import CodePanel from "../lesson/CodePanel.svelte";
  import TestResults from "../lesson/TestResults.svelte";
  import { passedAll, type Outcome } from "../runner/client";
  import type { CheckResult, CheckSuite } from "../runner/protocol";
  import { getRunner } from "../runner/shared";
  import { moment } from "../ui/moments.svelte";
  import { LAIRS, lairName, lairOf } from "../village/layout";
  import LairScene from "./LairScene.svelte";
  import SpriteCanvas from "../ui/SpriteCanvas.svelte";
  import { ICONS } from "../art/sprites";
  import { TROPHY_SPRITES } from "../art/trophies";
  import { game, update } from "../store/progress.svelte";

  type Suite = CheckSuite & { title: string };
  let { boss, skip = false }: { boss: Boss; skip?: boolean } = $props();
  // The route flag is read once: after the win the world is marked skipped, and the screen must not
  // flip back to the sleeping view under the learner.
  const skipMode = untrack(() => skip);
  const mine = $derived(bossState(game.progress, boss.id));
  const hp = $derived(bossHp(boss, mine));
  const checksLeft = $derived(hardChecksLeft(boss, mine));
  let mode: "normal" | "hard" = $state("normal");
  const lair = $derived(lairOf(boss.world, boss.region)?.lair ?? LAIRS[boss.region] ?? "ruins");
  // The defeat scene plays when the boss falls during this visit.
  const wonOnArrival = untrack(() => Boolean(bossState(game.progress, boss.id).wonAt));
  let defeated = $state(false);
  let celebrated = false; // plays once, so closing the scene does not bring it back
  $effect(() => {
    if (!wonOnArrival && mine.wonAt && !celebrated) {
      celebrated = true;
      defeated = true;
      moment("fanfare");
    }
  });
  let results: { title: string; outcome: Outcome<CheckResult> }[] = $state([]);
  // One stage note is open at a time: the first one not yet beaten, so its rules sit beside the code.
  // svelte-ignore state_referenced_locally (the arena remounts per boss)
  let openStage: string | null = $state(
    boss.stages.find((s) => !bossState(game.progress, boss.id).stagesPassed.includes(s.id))?.id ?? null,
  );
  let briefOpen = $state(false);
  // the story in one line: the brief's first paragraph, as plain text
  const story = $derived(
    boss.intro
      .split(/\n\s*\n/)[0]
      .replace(/[`*_#]/g, "")
      .trim(),
  );

  async function runSuites(code: string, suites: Suite[]): Promise<boolean[]> {
    results = [];
    const passed: boolean[] = [];
    for (const suite of suites) {
      const outcome = await getRunner().check(code, suite);
      results = [...results, { title: suite.title, outcome }];
      passed.push(passedAll(outcome));
    }
    return passed;
  }

  async function checkNormal(code: string): Promise<void> {
    const passed = await runSuites(code, boss.stages);
    const beaten = boss.stages.filter((_, i) => passed[i]).map((s) => s.id);
    const before = mine.stagesPassed.length;
    update((p) => {
      const day = today();
      const next = passStages(p, boss, beaten, day);
      const allStages = boss.stages.every((s) => bossState(next, boss.id).stagesPassed.includes(s.id));
      return skipMode && allStages ? applySkip(bundle, next, boss.world, day) : next;
    });
    if (mine.stagesPassed.length > before) moment("pass");
  }

  async function checkHard(code: string): Promise<void> {
    update((p) => recordHardCheck(p, boss));
    const passed = await runSuites(code, [
      ...boss.stages,
      { title: "Hard mode tests", tests: boss.hardTests, cases: boss.hardCases, requires: boss.hardRequires },
    ]);
    if (passed.every(Boolean)) update((p) => winHard(p, boss, today()));
  }

  function switchTo(next: "normal" | "hard"): void {
    mode = next;
    results = [];
  }

  let round = $state(0); // bumped by a rematch so the code panel reloads the starter
  function rematch(): void {
    update((p) => rematchBoss(p, boss));
    switchTo("normal");
    round += 1;
  }
</script>

<Screen title={boss.title} here="boss" wide>
  {#if !bossOpen(bundle, game.progress, boss) && !skipMode}
    <div class="asleep paper px">
      <LairScene {lair} cleared={false} />
      <p>This boss wakes up once every lesson of its region is passed.</p>
    </div>
  {:else}
    {#if skipMode}
      <p class="skip-note paper px">
        Test out: winning this fight marks every lesson of this world as done. Hard mode stays yours to win.
      </p>
    {/if}
    <!-- the arena: the lair with its HP built in, the stage notes pinned beside the code -->
    <div class="arena">
      <div class="scene">
        <LairScene {lair} cleared={Boolean(mine.wonAt)} />
        <div class="plate px">
          <span class="tag warn">Boss · the {lairName(boss.world, boss.region)}</span>
          <p class="story">{story}</p>
        </div>
        <div class="hpline">
          <span>HP</span>
          <span class="hpbar px" role="img" aria-label="Boss HP {hp.left} of {hp.total}">
            {#each boss.stages as s (s.id)}<i
                class:gone={mine.stagesPassed.includes(s.id)}
                style="flex: {s.hp}"
              ></i>{/each}
          </span>
          <span>{hp.left} / {hp.total}</span>
        </div>
      </div>
      <div class="fight">
        <div class="side">
          <ol class="pins" aria-label="Stages">
            {#each boss.stages as s, i (s.id)}
              {@const done = mine.stagesPassed.includes(s.id)}
              <li class="pin px" class:done class:open={openStage === s.id}>
                <button
                  type="button"
                  class="pin-head"
                  aria-expanded={openStage === s.id}
                  onclick={() => (openStage = openStage === s.id ? null : s.id)}
                >
                  <span class="box px" aria-hidden="true">{done ? "✓" : ""}</span>
                  <span class="t"
                    >{i + 1}. {s.title}{#if done}<span class="sr-only"> (beaten)</span>{/if}</span
                  >
                  <span class="tag {done ? 'good' : ''}">{s.hp} HP</span>
                </button>
                {#if openStage === s.id}
                  <div class="p"><Markdown text={s.prompt} /></div>
                {/if}
              </li>
            {/each}
          </ol>
          <button
            type="button"
            class="fold"
            aria-expanded={briefOpen}
            onclick={() => (briefOpen = !briefOpen)}>The whole brief</button
          >
          {#if briefOpen}<div class="intro"><Markdown text={boss.intro} /></div>{/if}
          {#if mine.wonAt && hp.left === 0}
            <p class="sub">Beaten! You won the {boss.trophy.name}.</p>
            <button type="button" class="rematch" onclick={rematch}>Fight again</button>
          {:else}
            <p class="sub">
              {mine.wonAt ? "Rematch for practice, no XP: " : ""}{mine.stagesPassed.length} of {boss.stages
                .length} stages done.
            </p>
          {/if}
          {#if hardOpen(game.progress, boss)}
            <div class="modes" role="group" aria-label="Mode">
              <button type="button" aria-pressed={mode === "normal"} onclick={() => switchTo("normal")}
                >Normal</button
              >
              <button type="button" aria-pressed={mode === "hard"} onclick={() => switchTo("hard")}
                >Hard mode</button
              >
            </div>
          {/if}
        </div>
        <div class="code">
          {#if mode === "normal"}
            {#key round}
              <CodePanel
                id="{boss.id}-normal"
                title={boss.title}
                prompt="Check runs every stage's tests. A beaten stage stays beaten."
                starter={boss.starter}
                draftKey="boss:{boss.id}"
                passed={hp.left === 0}
                variant="slate"
                oncheck={checkNormal}
              >
                {#each results as r, i (i)}<h3>{r.title}</h3>
                  <TestResults outcome={r.outcome} />{/each}
              </CodePanel>
            {/key}
          {:else}
            <CodePanel
              id="{boss.id}-hard"
              title="{boss.title}, hard mode"
              prompt="No starter code, more tests, and {boss.hardChecks} Checks per attempt."
              starter=""
              draftKey="boss:{boss.id}:hard"
              passed={Boolean(mine.hardWonAt)}
              checkDisabled={checksLeft === 0}
              checkLabel="Check ({checksLeft} left)"
              variant="slate"
              oncheck={checkHard}
            >
              {#if checksLeft === 0 && !mine.hardWonAt}
                <p>
                  No Checks left in this attempt.
                  <button type="button" onclick={() => update((p) => newHardAttempt(p, boss))}
                    >Start a new attempt</button
                  >
                </p>
              {/if}
              {#each results as r, i (i)}<h3>{r.title}</h3>
                <TestResults outcome={r.outcome} />{/each}
              {#if mine.hardWonAt}<p class="won">
                  <SpriteCanvas
                    grid={TROPHY_SPRITES[boss.hardTrophy.id] ?? ICONS.star}
                    scale={3}
                    label={boss.hardTrophy.name}
                  /> Hard mode beaten! You won the {boss.hardTrophy.name}.
                </p>{/if}
            </CodePanel>
          {/if}
        </div>
      </div>
    </div>
  {/if}
  {#if defeated}
    <div
      class="defeat"
      role="dialog"
      aria-modal="true"
      aria-labelledby="defeat-h"
      use:modal={() => (defeated = false)}
    >
      <div class="card paper px">
        <span class="ribbon">Boss beaten!</span>
        <h2 id="defeat-h">{boss.title} is beaten</h2>
        <div class="clearing">
          <div class="before"><LairScene {lair} cleared={false} /></div>
          <div class="after"><LairScene {lair} cleared={true} /></div>
        </div>
        <div class="prize">
          <SpriteCanvas
            grid={TROPHY_SPRITES[boss.trophy.id] ?? ICONS.star}
            scale={5}
            label={boss.trophy.name}
          />
        </div>
        <p>
          The {lairName(boss.world, boss.region)} is quiet again, and the {boss.trophy.name} is on its way to your
          house.
        </p>
        <div class="row">
          <a class="btnlink primary px" href="#/">Back to the village</a>
          <button type="button" onclick={() => (defeated = false)}>Stay here</button>
        </div>
      </div>
    </div>
  {/if}
</Screen>

<style>
  h3 {
    margin: 12px 0 0;
    font-size: 16px;
  }
  .arena {
    display: grid;
    gap: 12px;
  }
  .scene {
    position: relative;
    overflow: hidden;
    background: linear-gradient(var(--sky) 0 42%, var(--grass) 42%);
    box-shadow: inset 0 0 0 4px var(--outline);
  }
  .scene :global(canvas) {
    display: block;
    width: 100%;
    height: auto;
  }
  .plate {
    --c: 3px;
    position: absolute;
    left: 12px;
    top: 12px;
    max-width: min(400px, 46%);
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    color: var(--chalk);
    background: rgb(23 35 22 / 0.88);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .plate .tag {
    justify-self: start;
  }
  .story {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
  }
  .hpline {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 0;
    font: 700 15px var(--font-pixel);
    color: var(--chalk);
    text-shadow: 2px 2px 0 var(--outline);
  }
  .hpbar {
    --c: 2px;
    flex: 1;
    display: flex;
    gap: 3px;
    height: 20px;
    padding: 3px;
    background: #3a1f1a;
    box-shadow: inset 0 0 0 3px var(--outline);
  }
  .hpbar i {
    background: repeating-linear-gradient(90deg, var(--coral) 0 8px, var(--coral-2) 8px 10px);
    transition: opacity 500ms steps(5, end);
  }
  .hpbar i.gone {
    opacity: 0;
  }
  .fight {
    display: grid;
    grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
    gap: 12px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .fight {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .side {
    display: grid;
    gap: 8px;
  }
  .pins {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .pin {
    --c: 3px;
    position: relative;
    padding: 4px 12px 8px;
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .pin::before {
    content: "";
    position: absolute;
    right: 14px;
    top: -1px;
    width: 10px;
    height: 10px;
    background: var(--coral);
    box-shadow: inset 0 0 0 2px var(--outline);
  }
  .pin.open {
    box-shadow:
      inset 0 0 0 2px var(--outline),
      inset 5px 0 0 2px var(--butter);
  }
  .pin.done {
    opacity: 0.75;
  }
  .pin-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    width: 100%;
    min-height: 40px;
    padding: 0 18px 0 0;
    color: var(--text);
    text-align: left;
    background: none;
    box-shadow: none;
    clip-path: none;
  }
  .pin-head:active:not(:disabled) {
    padding: 0 18px 0 0;
    box-shadow: none;
  }
  .pin-head:focus-visible {
    outline: 3px solid var(--link);
    outline-offset: 0;
  }
  .box {
    --c: 2px;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 2px var(--outline);
    font: 700 13px var(--font-pixel);
    color: var(--good);
  }
  .t {
    font: 700 15px var(--font-pixel);
  }
  .p :global(p) {
    margin: 0 0 6px;
    color: var(--soft);
    font-size: 14px;
    line-height: 1.5;
  }
  .p :global(code) {
    color: var(--code);
  }
  .intro {
    padding: 4px 2px 8px;
    font-size: 14px;
    line-height: 1.5;
  }
  .intro :global(p) {
    margin: 0 0 8px;
  }
  .intro :global(pre) {
    overflow-x: auto;
    font-size: 13px;
  }
  .sub {
    margin: 4px 0 0;
    color: var(--soft);
    font-size: 14px;
  }
  .rematch {
    justify-self: start;
  }
  .modes {
    display: flex;
    gap: 8px;
  }
  .modes button[aria-pressed="true"] {
    background: var(--butter);
    color: var(--ink-dark);
  }
  .code :global(.panel) {
    margin-top: 0;
  }
  .asleep {
    padding: 16px;
    display: grid;
    gap: 10px;
  }
  .skip-note {
    margin: 0;
    padding: 10px 14px;
    color: var(--ink-dark);
    font-size: 14px;
    line-height: 1.45;
    box-shadow:
      inset 0 0 0 3px var(--outline),
      inset 6px 0 0 3px var(--butter);
  }
  .won {
    color: var(--good);
    font-weight: 700;
  }
  .defeat {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(15 23 14 / 0.55);
  }
  .defeat .card {
    width: min(560px, 100%);
    padding: 22px;
    display: grid;
    gap: 12px;
    justify-items: center;
    text-align: center;
  }
  .defeat h2 {
    margin: 0;
    font-size: 28px;
  }
  .defeat p {
    margin: 0;
  }
  .prize {
    padding: 8px 14px;
    background: var(--paper-2);
    box-shadow: inset 0 0 0 3px var(--outline);
  }
  .won {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .clearing {
    position: relative;
    width: 100%;
  }
  .after {
    position: absolute;
    inset: 0;
  }
  @media (prefers-reduced-motion: no-preference) {
    .after {
      animation: clear 1800ms ease-in-out both;
    }
    @keyframes clear {
      from {
        opacity: 0;
      }
      40% {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
</style>
