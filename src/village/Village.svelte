<script lang="ts">
  import { BUBBLE_CORNER, pixelRoundRect, pixelTail } from "./bubbleShape";
  import { onMount, untrack } from "svelte";
  import { bundle } from "../content/bundle";
  import { regionName } from "../content/regions";
  import { bossOpen } from "../learning/access";
  import { bossState } from "../learning/boss";
  import { today } from "../learning/dates";
  import { STAGE_NAMES, isWilting } from "../learning/plants";
  import { levelFor } from "../learning/xp";
  import { game } from "../store/progress.svelte";
  import { VILLAGER_CLOTHES } from "../art/palette";
  import { announceLevel, moment } from "../ui/moments.svelte";
  import { isRainyDay, type Palette } from "./clock";
  import { clock, forcedSeason, forcedShoreStage } from "./clock-state.svelte";
  import { lootFound } from "../learning/house";
  import { seasonFor, windAt, type Season } from "./weather";
  import { rockLine } from "./terrain";
  import { FEATURES, featureLand } from "./scenery";
  import { shoreStoryLairs } from "./features/shoreStory";
  import { DESTINIES, newScenes, SCENE_FEATURES, type NewScene } from "./destinies";
  import { decorFor, newSince, villagersFor } from "./decor";
  import { describeJob, jobsFor, type Job } from "./routines";
  import TodayCard from "../ui/TodayCard.svelte";
  import { board, boardWidth, NARROW } from "../ui/board.svelte";
  import { clearShowMe, showMe } from "../ui/showme.svelte";
  import {
    MAP_H,
    MAP_W,
    PLACES,
    PLAZA,
    STREET_Y,
    TILE,
    VX,
    buildMap,
    village,
    type Place,
    type Point,
  } from "./layout";
  import { actorAt, actorAtPoint, stepActor, tileOf, type Actor } from "./motion";
  import { findPath } from "./paths";
  import {
    BIRD_SCARE_TILES,
    BIRD_SPOTS,
    drawDynamic,
    drawScene,
    drawTerrain,
    nextFlight,
    type LairState,
    type Plot,
  } from "./render";
  import type { Piece } from "../art/standing";
  import { nudgeFor, talkContext } from "./talk";
  import { freshMemory, pickLine, type LineMemory } from "./lines";
  import { AREAS, type Area } from "./areas";
  import { modal } from "../ui/modal";
  import { forgetClosed, openWorlds, unseenOpened, worldById } from "../worlds/registry";
  import { cachedTerrain, keepTerrain, terrainCacheKey } from "./terrainCache";
  import { coveredRect, covers, type ViewRect } from "./view";
  import { SAMPLE_COUNT, SAMPLE_WARMUP_MS, WINDOW_COUNT, lightOverride, shouldGoLight } from "./light";
  import { ambientEvery, nextFrameMs } from "./cadence";
  import { paintRate, perfEnabled } from "./perf";
  import { onIdle } from "../ui/idle";
  import { prefetchLessonAssets } from "../lesson/prefetch";

  // While a board is open (covered), the village keeps `focus` (a place id) lit beside it and stops taking clicks.
  let { focus = null, covered = false }: { focus?: string | null; covered?: boolean } = $props();

  // Worlds open when their key trophy is owned; read once when the village opens (App remounts it when one opens).
  const open = openWorlds(bundle, game.progress);
  const map = buildMap(open, featureLand());
  const closedAreas = AREAS.filter((a) => !open.includes(a.world));
  const day = today();
  // Who lives here grows with the level (Lou at 2, Mika at 6); counted when the village opens.
  // Noa the ranger lives in the forest once its road is open, and Alex the stargazer in the mountains.
  const VILLAGERS = [
    ...villagersFor(levelFor(game.progress.xp)),
    ...(open.includes("w2") ? ["Noa"] : []),
    ...(open.includes("w3") ? ["Alex"] : []),
    "Juniper",
  ];
  const HOMES: Record<string, Point> = {
    Juniper: village(28, 14), // below the school door
    Noa: { x: 20, y: 46 },
    Alex: { x: 78, y: 14 },
    Wren: { x: 28, y: 51 },
  };
  const concepts = [...new Set(bundle.lessons.flatMap((l) => l.concepts))];

  const bossFor = (p: Place) =>
    p.region ? bundle.bosses.find((b) => b.world === p.world && b.region === p.region) : undefined;

  function lairState(p: Place): LairState {
    // the cheat screen can force a shore story stage for previews (World 4 has no bosses yet)
    const forced = forcedShoreStage.stage;
    if (forced !== null && p.kind === "lair" && p.world === "w4")
      return shoreStoryLairs(forced)[p.id] ?? "asleep";
    const boss = bossFor(p);
    if (!boss) return "scenery";
    if (bossState(game.progress, boss.id).wonAt) return "cleared";
    return bossOpen(bundle, game.progress, boss) ? "awake" : "asleep";
  }

  function hrefFor(p: Place): string | null {
    if (p.kind === "school") return "#/school";
    if (p.kind === "cabin" || p.kind === "observatory" || p.kind === "hall") return `#/school/${p.world}`;
    if (p.kind === "library") return "#/library";
    if (p.kind === "garden") return "#/garden";
    if (p.kind === "house") return "#/house";
    const boss = bossFor(p);
    return boss && lairState(p) !== "asleep" ? `#/boss/${boss.id}` : null;
  }

  const lairs = $derived(
    Object.fromEntries(PLACES.filter((p) => p.kind === "lair").map((p) => [p.id, lairState(p)])),
  );
  const cleared = PLACES.filter((p) => p.kind === "lair" && lairState(p) === "cleared").map((p) => p.id); // read once, like the routines
  const plots = $derived(
    concepts.map((concept): Plot => {
      const plant = game.progress.plants[concept];
      if (!plant) return { concept, stage: null };
      return { concept, stage: isWilting(plant, day) ? "wilting" : STAGE_NAMES[plant.stage] };
    }),
  );
  const scene = $derived({
    palette: clock.palette,
    level: levelFor(game.progress.xp),
    found: lootFound(bundle, game.progress).map((f) => f.id),
    plots,
    lairs,
    season: forcedSeason.season ?? seasonFor(new Date()),
  });
  const talk = $derived(talkContext(bundle, game.progress, day));

  let canvas: HTMLCanvasElement;
  let viewport: HTMLDivElement;
  let scale = $state(3);
  const bubbleBody = $derived(pixelRoundRect(BUBBLE_CORNER, scale));
  const bubbleTail = $derived(pixelTail(4, scale));
  // Talking: clicking (or tapping) a villager shows a bubble over their head; the list below is the keyboard way.
  let bubble: { who: number; text: string } | null = $state(null);
  let bubbleAt = $state({ x: 0, y: 0 });
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  // the bubble fades by the wall clock, since the frame loop stops under reduced motion
  function fadeIn(ms: number): void {
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => (bubble = null), ms);
  }
  let heard = $state(""); // the same words for screen readers
  const memories: LineMemory[] = [];
  let staticLayer: HTMLCanvasElement | null = null;
  let terrain: HTMLCanvasElement | null = null;
  let terrainKey = ""; // what the terrain layer was painted for: palette and season
  let buildToken = 0; // which scene composition last started, so a slow terrain load cannot overwrite a newer one
  let standing: Piece[] = []; // what walkers can pass behind, from the last static paint

  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rain = isRainyDay(day) && !reduced;
  // Light mode: chosen from the machine's own paint times, or forced by ?light=1 / ?light=0 for testing.
  const forcedLight = lightOverride(location.search);
  let light = forcedLight === true;
  const samples: number[] = []; // recent paint times, for light-mode detection
  let sampleWarmUntil = Infinity; // no judgement until a static layer is up and has settled
  const MOTION_HOLD_MS = 250; // a drag or scroll keeps painting every frame this long after it stops
  let motionUntil = 0; // the player is driving the map until then
  // ?perf=1: a small readout of the loop's own numbers, off (and free) otherwise.
  const perfOn = perfEnabled(location.search);
  let perfText = $state("");
  const paintTimes: number[] = [];
  let lastPaintMs = 0;
  let displayMs = 0;
  let wakeLoop: (() => void) | undefined; // set by the frame loop, so a board closing can resume it
  // Mochi idles at the west edge of the square, beside the fountain when there is one
  const mochi = actorAt({ x: PLAZA.x, y: PLAZA.center.y }, 12);
  const starts = [20, 36, 12, 44].map((x) => x + VX);
  // each villager works through their routine: walk to a spot, do something there for a while, move on
  const villagers: {
    actor: Actor;
    clothes: string;
    jobs: Job[];
    job: number;
    working: boolean;
    rest: number;
  }[] = VILLAGERS.map((name, i) => ({
    actor: actorAt(HOMES[name] ?? { x: starts[i % starts.length], y: STREET_Y }, 3),
    clothes: VILLAGER_CLOTHES[i % VILLAGER_CLOTHES.length],
    jobs: jobsFor(name, cleared),
    job: -1,
    working: false,
    rest: 0.5 + i,
  }));
  let travel: string | null = null; // where Mochi is walking to
  let seconds = 0;
  let idle = 0; // seconds Mochi has stood still, for the nap
  const NAP_AFTER = 15;
  let world: HTMLDivElement;

  let paintedView: ViewRect | null = null; // the part of the map the last paint covered
  function paint(): void {
    const ctx = canvas?.getContext("2d");
    if (!ctx || !staticLayer) return;
    const started = performance.now();
    // Only the visible part of the map (plus room for overhanging sprites) is blitted and stepped: the rest
    // of the map is off screen, and the viewport repaints as soon as it scrolls past what was painted.
    const view =
      viewport && scale
        ? coveredRect(
            viewport.scrollLeft,
            viewport.scrollTop,
            viewport.clientWidth,
            viewport.clientHeight,
            scale,
          )
        : { x: 0, y: 0, w: MAP_W * TILE, h: MAP_H * TILE };
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();
    ctx.drawImage(staticLayer, view.x, view.y, view.w, view.h, view.x, view.y, view.w, view.h);
    const walker = (a: Actor, name?: string, clothes?: string) => ({
      x: a.x,
      y: a.y,
      facing: a.facing,
      moving: a.moving,
      clothes,
      name,
    });
    drawDynamic(ctx, {
      palette: clock.palette,
      lairs,
      time: clock.time,
      t: seconds,
      mochi: walker(mochi),
      napping: idle > NAP_AFTER,
      villagers: villagers.map((v, i) => {
        const job = v.jobs[v.job];
        let activity = !job
          ? null
          : v.working
            ? job.activity
            : job.activity === "carry" && v.actor.moving
              ? "carry"
              : null;
        // nobody chats alone: without a neighbour close by, they just stand there
        if (
          activity === "chat" &&
          !villagers.some((o) => o !== v && Math.hypot(o.actor.x - v.actor.x, o.actor.y - v.actor.y) < 3)
        )
          activity = null;
        return { ...walker(v.actor, VILLAGERS[i], v.clothes), activity };
      }),
      rain,
      ducks: decorFor(scene.level).includes("ducks"),
      fogged: closedAreas.map((a) => a.rect),
      gates: closedAreas.map((a) => ({ x: a.gate.x, y: a.gate.y, kind: a.gateSprite })),
      still: reduced,
      light,
      birds,
      sparkles: sparkles.filter((sp) => sp.until > performance.now()),
      fireflies: decorFor(scene.level).includes("fireflies"),
      balloon: decorFor(scene.level).includes("balloon"),
      life: {
        t: seconds,
        still: reduced,
        palette: clock.palette,
        season: scene.season,
        wind: windAt(reduced ? 0 : seconds),
        windmill: decorFor(scene.level).includes("windmill"),
        vane: scene.found.includes("weather-vane"),
        wheat: decorFor(scene.level).includes("wheat"),
        prints: prints.map((p) => ({ x: p.x, y: p.y, age: seconds - p.born })),
      },
      standing,
      view,
    });
    ctx.restore();
    paintedView = view;
    lastPaintMs = performance.now() - started;
    if (perfOn) {
      paintTimes.push(started);
      while (paintTimes.length > 0 && paintTimes[0] < started - 1500) paintTimes.shift();
    }
  }

  // Scrolling and resizing must not show unpainted edges: the frame loop repaints the visible part on the
  // frame the scroll arrives, with the new position. Reduced motion has no loop, so this one frame paints.
  let scrollRaf = 0;
  function onViewChanged(): void {
    motionUntil = performance.now() + MOTION_HOLD_MS;
    if (!reduced || !staticLayer || !viewport || scrollRaf) return;
    const visible = coveredRect(
      viewport.scrollLeft,
      viewport.scrollTop,
      viewport.clientWidth,
      viewport.clientHeight,
      scale,
      0,
    );
    if (paintedView && covers(paintedView, visible)) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      paint();
    });
  }

  // the little birds on the paths: each one's flight clock (0 while it hops about on the ground)
  const birds = BIRD_SPOTS.map((spot) => ({ ...spot, flight: 0 }));

  // Mochi's paw prints on snowy mountain paths and sandy river banks (the newest 24, fading)
  let prints: { x: number; y: number; born: number }[] = [];
  let lastTile = "";
  function leavePrint(): void {
    const tx = Math.floor(mochi.x + 0.5);
    const ty = Math.floor(mochi.y + 0.5);
    const key = `${tx},${ty}`;
    if (key === lastTile || reduced) return;
    lastTile = key;
    const onSnow = ty < 28 && "=#".includes(map.tiles[ty]?.[tx] ?? "") && ty + 0.5 < rockLine(tx + 0.5);
    const onSand = [-1, 1].some((d) => map.tiles[ty]?.[tx + d] === "~") && map.tiles[ty]?.[tx] !== "~";
    if (!onSnow && !onSand) return;
    prints = [...prints, { x: tx * TILE + 2, y: ty * TILE + 4, born: seconds }].slice(-24);
  }

  function tick(dt: number): void {
    idle = mochi.moving ? 0 : idle + dt;
    if (mochi.moving) leavePrint();
    for (const b of birds)
      b.flight = nextFlight(b.flight, Math.hypot(mochi.x - b.x, mochi.y - b.y) < BIRD_SCARE_TILES, dt);
    if (stepActor(mochi, dt) && travel) {
      const href = travel;
      travel = null;
      location.hash = href;
    }
    for (const v of villagers) {
      if (v.actor.path.length > 0) {
        stepActor(v.actor, dt);
        continue;
      }
      const job = v.jobs[v.job];
      if (job && !v.working) {
        // arrived: turn to the work and start
        v.working = true;
        v.actor.facing = job.facing;
        v.rest = job.seconds * (0.8 + Math.random() * 0.4);
        doing[villagers.indexOf(v)] = describeJob(job, true);
      }
      v.rest -= dt;
      if (v.rest > 0) continue;
      v.job = (v.job + 1) % v.jobs.length;
      v.working = false;
      v.actor.path = (findPath(map, tileOf(v.actor), v.jobs[v.job].spot) ?? []).slice(1);
      doing[villagers.indexOf(v)] = describeJob(v.jobs[v.job], false);
    }
    if (bubble) {
      const a = villagers[bubble.who].actor;
      bubbleAt = { x: a.x + 0.5, y: a.y - 1 };
    }
    if (travel && viewport) {
      viewport.scrollLeft = mochi.x * TILE * scale - viewport.clientWidth / 2;
      viewport.scrollTop = mochi.y * TILE * scale - viewport.clientHeight / 2;
    }
  }

  // Clicking a place sends Mochi walking there; reduced motion and modified clicks navigate at once.
  function go(e: MouseEvent, place: Place): void {
    if (drag?.moved) {
      e.preventDefault();
      return;
    }
    const href = hrefFor(place);
    if (!href || reduced || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const path = findPath(map, tileOf(mochi), place.door);
    if (!path) return;
    e.preventDefault();
    mochi.path = path.slice(1);
    idle = 0;
    travel = href;
    if (mochi.path.length === 0) {
      travel = null;
      location.hash = href;
    }
  }

  // The stored terrain for this build, palette and season, or a freshly painted one that is stored as it
  // goes. The paint is the fallback for every failure, so a missing cache only costs the 0.4 s it always did.
  async function terrainFor(
    palette: Palette,
    season: Season,
    w: number,
    h: number,
  ): Promise<HTMLCanvasElement | null> {
    const key = terrainCacheKey(palette, season);
    const stored = await cachedTerrain(key, w, h);
    if (stored) return stored;
    const ground = document.createElement("canvas");
    ground.width = w;
    ground.height = h;
    const groundCtx = ground.getContext("2d");
    if (!groundCtx) return null;
    drawTerrain(groundCtx, map, palette, season);
    // Store it once the frame is up: the PNG encode must not stand between the learner and the first map.
    onIdle(() => void keepTerrain(key, ground));
    return ground;
  }

  $effect(() => {
    const current = scene;
    const w = MAP_W * TILE;
    const h = MAP_H * TILE;
    // The terrain only depends on the palette and the season, so a scene change that leaves it alone
    // (a Check planting or looting) keeps the cached terrain and redraws just the layer on top of it.
    const key = `${current.palette}|${current.season}`;
    const token = ++buildToken;
    // A Check can change the scene while its board covers the map. Then the redraw waits for idle, so the
    // result is on screen first; the board is not a trigger, hence untrack.
    const defer = untrack(() => covered);
    void (async () => {
      let ground = terrain;
      if (!ground || terrainKey !== key) {
        ground = await terrainFor(current.palette, current.season, w, h);
        if (!ground || token !== buildToken) return; // a newer scene took over while the terrain loaded
        terrain = ground;
        terrainKey = key;
      }
      const compose = (): void => {
        if (token !== buildToken) return;
        const layer = document.createElement("canvas");
        layer.width = w;
        layer.height = h;
        const ctx = layer.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(ground, 0, 0);
        const scratch = document.createElement("canvas");
        scratch.width = w;
        scratch.height = h;
        standing = drawScene(
          ctx,
          map,
          current,
          scratch.getContext("2d", { willReadFrequently: true }) ?? undefined,
        );
        staticLayer = layer;
        // A static redraw starts the light-mode judgement again: the first paints after it are not a slow machine.
        samples.length = 0;
        sampleWarmUntil = performance.now() + SAMPLE_WARMUP_MS;
        paint();
      };
      if (defer) onIdle(compose, 500);
      else compose();
    })();
  });

  onMount(() => {
    const fit = (): void => {
      scale = innerWidth < 700 ? 2 : 3;
    };
    fit();
    addEventListener("resize", fit);
    addEventListener("resize", reframe);
    addEventListener("resize", onViewChanged);
    viewport?.addEventListener("scroll", onViewChanged, { passive: true });
    if (!covered) checkBanners();
    const centre = requestAnimationFrame(() => {
      if (!viewport || (covered && focus)) return; // a building under a board frames itself; otherwise start on the square
      viewport.scrollLeft = PLAZA.center.x * TILE * scale - viewport.clientWidth / 2;
      viewport.scrollTop = PLAZA.center.y * TILE * scale - viewport.clientHeight / 2;
    });
    let raf = 0;
    let lastFrame = 0;
    let sinceTick = 0;
    let framesSincePaint = 0;
    let focused = true;
    let perfAt = 0;
    const readout = (now: number): void => {
      if (!perfOn) return;
      perfAt = now;
      const hz = displayMs > 0 ? Math.round(1000 / displayMs) : 0;
      perfText = `${paintRate(paintTimes, now)} paint/s | last ${lastPaintMs.toFixed(1)} ms | ${hz} Hz | light ${light ? "on" : "off"}`;
    };
    // The map is stepped pixel art, so ambient motion needs about 30 paints a second, while anything the player
    // drives (a drag, a scroll, Mochi walking, a board opening or closing) paints on every display frame. The
    // ambient beat counts animation frames and paints every Nth one (N from the measured display rate), never
    // a timer, so every paint lands on a vsync at an even interval on 60 Hz and 120 Hz alike. A board over the
    // map and an unfocused window are quieter still. In light mode a board-covered map is painted once and
    // then left alone until the board closes.
    const step = (now: number): void => {
      raf = 0;
      const delta = lastFrame ? now - lastFrame : 0;
      lastFrame = now;
      displayMs = nextFrameMs(displayMs, delta);
      framesSincePaint++;
      const every = ambientEvery(displayMs, covered || !focused ? 10 : undefined);
      // Between ambient paints the frame only counts: no scene work, no viewport reads. A scroll or any
      // other move sets motionUntil, so its frame paints at once.
      if (now < motionUntil || travel !== null || mochi.moving || framesSincePaint >= every) {
        framesSincePaint = 0;
        sinceTick += Math.min(0.1, delta / 1000);
        const dt = sinceTick;
        sinceTick = 0;
        seconds += dt;
        tick(dt);
        paint();
        if (forcedLight === null && !light && now >= sampleWarmUntil) {
          samples.push(lastPaintMs);
          if (samples.length > SAMPLE_COUNT * WINDOW_COUNT) samples.shift();
          light = shouldGoLight(samples);
        }
        if (perfOn && now - perfAt > 250) readout(now);
        if (light && covered && staticLayer) {
          readout(now); // the last paint before the loop sleeps: show it, then wait for the close
          return;
        }
      } else {
        sinceTick += Math.min(0.1, delta / 1000);
      }
      raf = requestAnimationFrame(step);
    };
    const start = (): void => {
      if (reduced || raf) return;
      lastFrame = 0;
      sinceTick = 0;
      framesSincePaint = 0;
      raf = requestAnimationFrame(step);
    };
    const stop = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    wakeLoop = (): void => {
      motionUntil = performance.now() + MOTION_HOLD_MS;
      if (!covered) start();
    };
    const onVisibility = (): void => (document.hidden ? stop() : start());
    const onFocus = (): void => {
      focused = document.hasFocus();
    };
    document.addEventListener("visibilitychange", onVisibility);
    addEventListener("focus", onFocus);
    addEventListener("blur", onFocus);
    start();
    // The editor and the markdown renderer only load on demand, so warm them once the map is idle.
    onIdle(prefetchLessonAssets);
    return () => {
      stop();
      cancelAnimationFrame(centre);
      cancelAnimationFrame(scrollRaf);
      removeEventListener("resize", fit);
      removeEventListener("resize", reframe);
      removeEventListener("resize", onViewChanged);
      viewport?.removeEventListener("scroll", onViewChanged);
      document.removeEventListener("visibilitychange", onVisibility);
      removeEventListener("focus", onFocus);
      removeEventListener("blur", onFocus);
    };
  });

  // Drag to pan with a mouse; touch scrolls natively.
  let drag: { x: number; y: number; left: number; top: number; moved: boolean } | null = null;
  function down(e: PointerEvent): void {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop, moved: false };
  }
  function move(e: PointerEvent): void {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    viewport.scrollLeft = drag.left - dx;
    viewport.scrollTop = drag.top - dy;
  }
  function up(): void {
    setTimeout(() => (drag = null)); // after the click that ends a drag has been seen
  }

  // The level toast shows once per level, naming what is new since the level last seen.
  const SEEN_KEY = "code-village/seen-level";
  function readSeen(): number | null {
    try {
      const saved = localStorage.getItem(SEEN_KEY);
      return saved === null ? null : Number(saved);
    } catch {
      return null;
    }
  }
  function markSeen(level: number): void {
    try {
      localStorage.setItem(SEEN_KEY, String(level));
    } catch {
      // private mode: the toast may show again next visit
    }
  }
  function checkLevelUp(): void {
    const level = levelFor(game.progress.xp);
    const seen = readSeen();
    if (seen === null || level <= seen) {
      if (seen === null) markSeen(level);
      return;
    }
    const items = newSince(seen, level);
    markSeen(level); // shown now, so a reload does not raise it again
    if (items.length === 0) return;
    moment("fanfare");
    announceLevel({ level, items });
  }

  // A banner for the scenes found items brought to the map since the last visit, once; "Show me" scrolls to the
  // first and makes every new one sparkle for a few seconds.
  const SCENES_KEY = "code-village/seen-scenes";
  let newOnMap: NewScene[] | null = $state(null);
  let sparkles: { x: number; y: number; until: number }[] = [];
  function readSeenScenes(): string[] | null {
    try {
      const saved = localStorage.getItem(SCENES_KEY);
      return saved === null ? null : (JSON.parse(saved) as string[]);
    } catch {
      return null;
    }
  }
  function markSeenScenes(ids: string[]): void {
    try {
      localStorage.setItem(SCENES_KEY, JSON.stringify(ids));
    } catch {
      // private mode: the banner may show again next visit
    }
  }
  function checkScenes(): void {
    const seen = readSeenScenes();
    const fresh = newScenes(bundle.lessons, scene.found, seen, FEATURES);
    if (fresh === null)
      markSeenScenes(
        scene.found.flatMap((id) =>
          DESTINIES[id]?.kind === "scene" ? [(DESTINIES[id] as { feature: string }).feature] : [],
        ),
      );
    else if (fresh.length > 0) newOnMap = fresh;
  }
  function closeNewOnMap(showMe: boolean): void {
    if (!newOnMap) return;
    const fresh = newOnMap;
    markSeenScenes(
      [...new Set([...(readSeenScenes() ?? []), ...fresh.map((f) => f.feature)])].filter((id) =>
        SCENE_FEATURES.includes(id),
      ),
    );
    newOnMap = null;
    if (!showMe || !viewport) return;
    const first = fresh[0].at;
    viewport.scrollTo({
      left: first.x * TILE * scale - viewport.clientWidth / 2,
      top: first.y * TILE * scale - viewport.clientHeight / 2,
      behavior: reduced ? "auto" : "smooth",
    });
    const until = performance.now() + 4000;
    sparkles = fresh.map((f) => ({ ...f.at, until }));
  }

  // A newly opened world gets its own banner, once (an old save with the key already won sees it on its next visit).
  const WORLDS_KEY = "code-village/seen-worlds";
  let opened: { world: string; line: string; area: Area } | null = $state(null);
  function readSeenWorlds(): string[] | null {
    try {
      const saved = localStorage.getItem(WORLDS_KEY);
      return saved === null ? null : (JSON.parse(saved) as string[]);
    } catch {
      return null;
    }
  }
  function markSeenWorlds(ids: string[]): void {
    try {
      localStorage.setItem(WORLDS_KEY, JSON.stringify(ids));
    } catch {
      // private mode: the banner may show again next visit
    }
  }
  function checkOpened(): void {
    const seen = readSeenWorlds();
    if (seen && forgetClosed(seen, open).length !== seen.length) markSeenWorlds(forgetClosed(seen, open));
    const [first] = unseenOpened(open, seen && forgetClosed(seen, open));
    const world = first ? worldById(first) : undefined;
    const area = AREAS.find((a) => a.world === first);
    if (!world?.key || !area) return;
    opened = { world: world.id, line: `The ${world.key.trophyName} ${world.key.opens}.`, area };
    moment("fanfare");
  }
  function closeOpened(showMe: boolean): void {
    if (!opened) return;
    const { area } = opened;
    markSeenWorlds([...(readSeenWorlds() ?? ["w1"]), opened.world]);
    opened = null;
    if (showMe && viewport) {
      viewport.scrollTo({
        left: area.hub.x * TILE * scale - viewport.clientWidth / 2,
        top: area.hub.y * TILE * scale - viewport.clientHeight / 2,
        behavior: reduced ? "auto" : "smooth",
      });
    }
  }

  // Hovering a blocked road shows why it is blocked; hovering an item's scene names the item and its lesson.
  const lessonOf = new Map(bundle.lessons.map((l) => [l.loot.id, l]));
  function sceneAt(tx: number, ty: number): { text: string; at: Point } | null {
    for (const id of scene.found) {
      const destiny = DESTINIES[id];
      if (destiny?.kind !== "scene") continue;
      const at = FEATURES.find((f) => f.id === destiny.feature)?.at;
      const lesson = lessonOf.get(id);
      if (at && lesson && at.x === tx && at.y === ty)
        return { text: `${lesson.loot.name}, from ${lesson.title}`, at };
    }
    return null;
  }

  let hint: { text: string; x: number; y: number } | null = $state(null);
  function hover(e: MouseEvent): void {
    if (!world) return;
    const box = world.getBoundingClientRect();
    const tx = Math.floor((e.clientX - box.left) / (TILE * scale));
    const ty = Math.floor((e.clientY - box.top) / (TILE * scale));
    const gate = closedAreas.find((a) => Math.abs(a.gate.x - tx) <= 1 && Math.abs(a.gate.y - ty) <= 1);
    const scene_ = sceneAt(tx, ty);
    hint = gate
      ? { text: worldById(gate.world)?.key?.gateHint ?? "", x: gate.gate.x, y: gate.gate.y }
      : scene_
        ? { text: scene_.text, x: scene_.at.x + 0.5, y: scene_.at.y }
        : null;
    // a tap has no "leave", so a tapped hint fades on its own
    clearTimeout(hintTimer);
    if (hint && e.type === "click") hintTimer = setTimeout(() => (hint = null), 4000);
  }
  let hintTimer: ReturnType<typeof setTimeout> | undefined;

  let doing: string[] = $state(VILLAGERS.map(() => "around the village"));
  function speak(i: number): void {
    const v = villagers[i];
    const job = v.jobs[v.job];
    const ctx = {
      passed: Object.keys(game.progress.lessons),
      nudge: nudgeFor(talk),
      activity: v.working && job ? job.activity : null,
    };
    const next = pickLine(VILLAGERS[i], memories[i] ?? freshMemory(), ctx);
    memories[i] = next.memory;
    bubble = { who: i, text: next.text };
    bubbleAt = { x: v.actor.x + 0.5, y: v.actor.y - 1 };
    fadeIn(4000);
    heard = `${VILLAGERS[i]}: ${next.text}`;
  }
  // The keyboard and screen reader way: bring the villager into view and let them speak.
  function visit(i: number): void {
    const a = villagers[i].actor;
    viewport?.scrollTo?.({
      left: a.x * TILE * scale - viewport.clientWidth / 2,
      top: a.y * TILE * scale - viewport.clientHeight / 2,
      behavior: reduced ? "auto" : "smooth",
    });
    speak(i);
  }

  // Clicking a villager on the map talks to them, like the buttons under the map.
  function clickMap(e: MouseEvent): void {
    if (drag?.moved || (e.target as Element).closest("a")) return;
    const box = world.getBoundingClientRect();
    const x = (e.clientX - box.left) / (TILE * scale) - 0.5;
    const y = (e.clientY - box.top) / (TILE * scale) - 0.5;
    const hit = actorAtPoint(
      villagers.map((v) => v.actor),
      x,
      y,
    );
    if (hit >= 0) speak(hit);
    else hover(e); // phones: a tap on an item or a blocked road shows its name
  }

  // The banners wait for the map: they show when the village is in view, not under a board.
  function checkBanners(): void {
    checkOpened();
    if (!opened) checkLevelUp();
    if (!opened) checkScenes();
  }
  let wasCovered: boolean | undefined; // set by the first run, so mounting under a board does not count as closing it
  let wasLooking = false;
  $effect(() => {
    // ...and not while the learner is looking at something a board pointed at (Show me)
    const looking = Boolean(showMe.at);
    if (!covered && !looking && (wasCovered || wasLooking)) checkBanners();
    wasCovered = covered;
    wasLooking = looking;
  });
  // A board closing wakes the loop that light mode paused behind it.
  $effect(() => {
    void covered;
    wakeLoop?.();
  });

  // With a board open, the building stays in view beside it and lit; the rest of the map dims.
  let spot: { x: number; y: number; r: number } | null = $state(null);
  function frame(place: Place, smooth: boolean): void {
    const cx = (place.x + place.w / 2) * TILE * scale;
    const cy = (place.y + place.h / 2) * TILE * scale;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const mapW = MAP_W * TILE * scale;
    const narrow = vw < NARROW;
    // on phones the sheet covers the bottom of the stage, so the map may scroll that much further to lift a building above it
    const mapH = MAP_H * TILE * scale + (narrow ? vh * 0.62 : 0);
    const bw = boardWidth(vw) + 16;
    // the board docks right, unless the map runs out on the right and the building would end up under it
    const besideRight = (vw - bw) / 2;
    const leftIfRight = Math.max(0, Math.min(mapW - vw, cx - besideRight));
    board.side = !narrow && cx - leftIfRight + (place.w * TILE * scale) / 2 > vw - bw ? "left" : "right";
    const tx = narrow ? vw / 2 : board.side === "right" ? besideRight : bw + (vw - bw) / 2;
    const left = Math.max(0, Math.min(mapW - vw, cx - tx));
    // phones: the board is a sheet over the bottom 62%, so the building sits in the strip above it
    const top = Math.max(0, Math.min(mapH - vh, cy - (narrow ? vh * 0.19 : vh / 2)));
    viewport.scrollTo?.({ left, top, behavior: smooth && !reduced ? "smooth" : "auto" });
    spot = { x: cx - left, y: cy - top, r: (Math.max(place.w, place.h) * TILE * scale) / 1.4 };
  }
  const focused = $derived(focus ? (PLACES.find((p) => p.id === focus) ?? null) : null);
  function reframe(): void {
    if (covered && focused && viewport) frame(focused, false);
  }
  $effect(() => {
    void scale;
    if (!covered || !focused || !viewport) {
      spot = null;
      return;
    }
    frame(focused, true);
  });
  // Opening a place from the plank: Mochi walks over to its door under the board.
  $effect(() => {
    if (!focused || travel) return;
    if (reduced) {
      // no walking under reduced motion: Mochi is simply at the door
      mochi.x = focused.door.x;
      mochi.y = focused.door.y;
      mochi.path = [];
      paint();
      return;
    }
    const path = findPath(map, tileOf(mochi), focused.door);
    if (path && path.length > 1) {
      mochi.path = path.slice(1);
      idle = 0;
    }
  });
  // "Show me" from a board: scroll to the spot and make it sparkle, with a caption and a way back.
  $effect(() => {
    const at = showMe.at;
    if (!at || covered || !viewport) return;
    viewport.scrollTo?.({
      left: at.x * TILE * scale - viewport.clientWidth / 2,
      top: at.y * TILE * scale - viewport.clientHeight / 2,
      behavior: reduced ? "auto" : "smooth",
    });
    const until = performance.now() + 4000;
    sparkles = [
      ...sparkles.filter((sp) => sp.until > performance.now()),
      ...showMe.spots.map((p) => ({ x: p.x, y: p.y, until })),
    ];
  });
  $effect(() => {
    if (covered) clearShowMe();
  });

  // The newest open world's regions, as the small progress strip on the map.
  const stripWorld = open.at(-1) ?? "w1";
  const strip = $derived(
    [...new Set(bundle.lessons.filter((l) => l.world === stripWorld).map((l) => l.region))].map((region) => {
      const these = bundle.lessons.filter((l) => l.world === stripWorld && l.region === region);
      return {
        region,
        name: regionName(stripWorld, region),
        passed: these.filter((l) => game.progress.lessons[l.id]).length,
        total: these.length,
      };
    }),
  );

  // Lairs and other worlds' schools read as "The marsh: The Gradebook" to keyboards and screen readers.
  function placeLabel(p: Place): string {
    const boss = bossFor(p);
    return boss ? `${p.name}: ${boss.title}` : p.name;
  }
</script>

<div class="village" class:covered>
  {#if perfOn}
    <p class="perf" aria-hidden="true">{perfText}</p>
  {/if}
  <h1 class="sr-only">Code Village</h1>
  <div
    class="viewport"
    bind:this={viewport}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointerleave={up}
    role="presentation"
    inert={covered}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (the Talk buttons are the keyboard way) -->
    <div
      class="world"
      bind:this={world}
      onclick={clickMap}
      onpointermove={hover}
      onpointerleave={() => (hint = null)}
      style="width: {MAP_W * TILE * scale}px; height: {MAP_H * TILE * scale}px"
    >
      <canvas bind:this={canvas} width={MAP_W * TILE} height={MAP_H * TILE} aria-hidden="true"></canvas>
      <!-- The buildings are the places: each is a link on the map, and together they are the keyboard way around. -->
      <nav aria-label="Places">
        <ul>
          {#each PLACES.filter((p) => open.includes(p.world)) as p (p.id)}
            {@const href = hrefFor(p)}
            {@const box = `left: ${p.x * TILE * scale}px; top: ${p.y * TILE * scale}px; width: ${p.w * TILE * scale}px; height: ${p.h * TILE * scale}px`}
            {#if href}
              <li>
                <a
                  class="place"
                  {href}
                  style={box}
                  aria-label={placeLabel(p)}
                  onclick={(e) => go(e, p)}
                  draggable="false"
                >
                  <span
                    class="plate"
                    aria-hidden="true"
                    class:left={p.x < 3}
                    class:right={p.x + p.w > MAP_W - 3}
                    >{p.name}{#if p.kind === "lair"}
                      <span class="tag {lairs[p.id] === 'cleared' ? 'good' : 'warn'}"
                        >{lairs[p.id] === "cleared" ? "beaten" : "awake"}</span
                      >{/if}</span
                  >
                </a>
              </li>
            {:else if lairs[p.id] === "asleep"}
              <li class="place" style={box}>
                <span
                  class="plate quiet"
                  aria-hidden="true"
                  class:left={p.x < 3}
                  class:right={p.x + p.w > MAP_W - 3}>{p.name} <span class="tag sleep">asleep</span></span
                >
                <span class="sr-only"
                  >{placeLabel(p)}, asleep until {regionName(p.world, p.region ?? "")} is done</span
                >
              </li>
            {/if}
          {/each}
          {#each closedAreas as a (a.id)}
            <li class="sr-only">
              The road to {worldById(a.world)?.name.replace("The ", "the ")} is blocked. {worldById(a.world)
                ?.key?.gateHint}
            </li>
          {/each}
        </ul>
      </nav>
      {#if bubble}{#key bubble}<div
            class="talk-bubble"
            style="left: {bubbleAt.x * TILE * scale}px; top: {bubbleAt.y * TILE * scale}px; --wp: {scale}px"
          >
            <p style="clip-path: {bubbleBody}"><b>{VILLAGERS[bubble.who]}</b> {bubble.text}</p>
            <span class="tail" style="clip-path: {bubbleTail}"></span>
          </div>{/key}{/if}
      {#if hint}<p
          class="hint-bubble"
          style="left: {hint.x * TILE * scale}px; top: {hint.y * TILE * scale}px"
        >
          {hint.text}
        </p>{/if}
    </div>
    {#if covered}<div class="sheet-room" aria-hidden="true"></div>{/if}
  </div>
  {#if covered}
    <!-- the dimmed village: a click on it closes the board, like Esc and the board's own Close -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="dim"
      class:lit={spot}
      style={spot ? `--x: ${spot.x}px; --y: ${spot.y}px; --r: ${spot.r}px` : ""}
      onclick={() => (location.hash = "#/")}
    ></div>
  {:else}
    <div class="note"><TodayCard /></div>
    {#if !showMe.at}<div class="worldstrip paper px" aria-label="Progress in {worldById(stripWorld)?.name}">
        <b>{worldById(stripWorld)?.name}</b>
        {#each strip as r (r.region)}<span
            class="seg"
            title="{r.name}: {r.passed} of {r.total}"
            style="--p: {(100 * r.passed) / r.total}%"
          ></span>{/each}
        <small
          >{strip.reduce((n, r) => n + r.passed, 0)} of {strip.reduce((n, r) => n + r.total, 0)} lessons</small
        >
      </div>{/if}
    {#if showMe.at}
      <div class="showbar paper px" role="status">
        <b>{showMe.label}</b>
        {#if showMe.backLabel}<a class="btnlink primary px" href={showMe.back}>{showMe.backLabel}</a>{/if}
        <button type="button" onclick={clearShowMe}>Close</button>
      </div>
    {/if}
  {/if}
  <!-- Villagers talk on the map. This list is only for keyboards and screen readers: hidden until it gets focus. -->
  <section class="talk" aria-labelledby="talk-heading" inert={covered}>
    <h2 id="talk-heading">Villagers</h2>
    <ul class="talkers">
      {#each VILLAGERS as name, i (name)}
        <li>
          <button type="button" onclick={() => visit(i)}><span><b>{name}</b>, {doing[i]}</span></button>
        </li>
      {/each}
    </ul>
    <p class="sr-only" aria-live="polite">{heard}</p>
  </section>
  {#if opened}
    <div
      class="levelup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="opened-h"
      use:modal={() => closeOpened(false)}
    >
      <div class="card paper px">
        <span class="ribbon">The road is open!</span>
        <h2 id="opened-h">{worldById(opened.world)?.name}</h2>
        <p class="opened-line">{opened.line}</p>
        <div class="row">
          <button type="button" class="primary" onclick={() => closeOpened(true)}>Show me</button>
          <button type="button" onclick={() => closeOpened(false)}>Later</button>
        </div>
      </div>
    </div>
  {:else if newOnMap}
    <div
      class="levelup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newonmap-h"
      use:modal={() => closeNewOnMap(false)}
    >
      <div class="card paper px">
        <span class="ribbon">New on the map</span>
        <h2 id="newonmap-h">{newOnMap.length === 1 ? "Something new" : `${newOnMap.length} new things`}</h2>
        <ul>
          {#each newOnMap.slice(0, 5) as item (item.feature)}<li>{item.name}: {item.label}</li>{/each}
          {#if newOnMap.length > 5}<li>and {newOnMap.length - 5} more</li>{/if}
        </ul>
        <div class="row">
          <button type="button" class="primary" onclick={() => closeNewOnMap(true)}>Show me</button>
          <button type="button" onclick={() => closeNewOnMap(false)}>Later</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .village {
    position: relative;
    height: 100%;
  }
  .perf {
    position: fixed;
    z-index: 30;
    right: 8px;
    bottom: 8px;
    margin: 0;
    padding: 4px 8px;
    background: rgb(15 23 14 / 0.8);
    color: #fff;
    font: 12px/1.4 var(--font-mono);
    white-space: nowrap;
    pointer-events: none;
  }
  .viewport {
    overflow: auto;
    height: 100%;
    overscroll-behavior: contain;
    background: var(--grass);
    cursor: grab;
  }
  .world {
    position: relative;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .place {
    position: absolute;
    display: block;
  }
  .plate {
    position: absolute;
    left: 50%;
    bottom: -14px;
    transform: translateX(-50%);
    padding: 2px 8px;
    background: var(--panel);
    color: var(--text);
    box-shadow: var(--frame);
    font: 14px var(--font-pixel);
    white-space: nowrap;
    text-decoration: none;
  }
  .plate.quiet {
    color: var(--dim);
  }
  .plate.left {
    left: 4px;
    transform: none;
  }
  .plate.right {
    left: auto;
    right: 4px;
    transform: none;
  }
  a.place:hover .plate {
    background: var(--btn);
    color: var(--btn-ink);
  }
  nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  a.place:focus-visible {
    outline: 4px solid var(--butter);
    outline-offset: 4px;
  }
  a.place:focus-visible .plate {
    background: var(--btn);
    color: var(--btn-ink);
  }
  /* with a board open the village dims, except a circle of light around the building the board belongs to */
  .dim {
    position: absolute;
    inset: 0;
    z-index: 4;
    background: rgb(15 23 14 / 0.55);
    cursor: pointer;
  }
  .dim.lit {
    background: radial-gradient(
      circle at var(--x) var(--y),
      transparent 0 var(--r),
      rgb(15 23 14 / 0.55) calc(var(--r) + 36px)
    );
  }
  @media (prefers-reduced-motion: no-preference) {
    .dim {
      animation: dim-in 420ms steps(4, end) both;
    }
    @keyframes dim-in {
      from {
        opacity: 0;
      }
    }
  }
  .showbar {
    position: absolute;
    z-index: 5;
    left: 50%;
    bottom: 20px;
    translate: -50% 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    max-width: calc(100% - 32px);
    padding: 12px 14px 12px 18px;
    filter: drop-shadow(0 6px 0 rgb(0 0 0 / 0.25));
  }
  .showbar b {
    font: 700 16px var(--font-pixel);
  }
  .sheet-room {
    display: none;
  }
  @media (max-width: 760px) {
    .sheet-room {
      display: block;
      height: 62%;
    } /* room to lift a building above the phone sheet */
  }
  .plate .tag {
    margin-left: 4px;
    padding: 0 6px 1px;
    font-size: 11px;
    text-transform: none;
  }
  .worldstrip {
    position: absolute;
    z-index: 3;
    left: 16px;
    bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    padding: 10px 14px;
    filter: drop-shadow(4px 4px 0 rgb(0 0 0 / 0.22));
  }
  .worldstrip b {
    font: 700 15px var(--font-pixel);
  }
  .worldstrip small {
    color: var(--dim);
    font-size: 13px;
  }
  .seg {
    width: 34px;
    height: 12px;
    box-shadow: inset 0 0 0 2px var(--outline);
    background: linear-gradient(90deg, var(--matcha) var(--p), transparent var(--p));
  }
  @media (max-width: 760px) {
    .worldstrip {
      display: none;
    } /* phones keep the map clear; the School has the counts */
  }
  /* today's to-dos, pinned to the map */
  .note {
    position: absolute;
    z-index: 3;
    top: 16px;
    right: 16px;
    width: min(320px, calc(100% - 32px));
    rotate: 1deg;
    filter: drop-shadow(5px 6px 0 rgb(0 0 0 / 0.22));
  }
  @media (max-width: 760px) {
    .note {
      top: 10px;
      right: 10px;
      rotate: none;
    }
  }
  .talk {
    padding: 14px 18px;
    color: var(--chalk);
    background: var(--wood);
    box-shadow:
      inset 0 0 0 4px var(--outline),
      inset 0 4px 0 4px var(--wood-hi),
      inset 0 -4px 0 4px var(--wood-3);
  }
  .talk h2 {
    margin: 0 0 8px;
    font-size: 20px;
    color: var(--chalk);
  }
  .talk:focus-within {
    position: absolute;
    z-index: 6;
    left: 16px;
    bottom: 16px;
    width: min(360px, calc(100% - 32px));
  }
  .talk:not(:focus-within) {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .talkers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .talkers button {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    font: 500 14px var(--font-ui);
  }
  .talkers b {
    font-family: var(--font-pixel);
  }
  .talk-bubble b {
    display: block;
    font: 700 13px var(--font-pixel);
    color: #000;
  }
  /* A round comic bubble in pixel art: the body and tail are stepped shapes (bubbleShape.ts), and the four
     drop shadows draw one pixel-wide outline around both together. */
  .talk-bubble {
    position: absolute;
    z-index: 3;
    width: max-content;
    max-width: 260px;
    pointer-events: none;
    transform: translate(-50%, calc(-100% - 6 * var(--wp)));
    filter: drop-shadow(var(--wp) 0 var(--outline)) drop-shadow(calc(-1 * var(--wp)) 0 var(--outline))
      drop-shadow(0 var(--wp) var(--outline)) drop-shadow(0 calc(-1 * var(--wp)) var(--outline));
  }
  .talk-bubble p {
    margin: 0;
    padding: 10px 16px;
    background: #fff;
    color: var(--ink-dark);
    font: 500 15px/1.3 var(--font-pixel);
  }
  .talk-bubble .tail {
    position: absolute;
    top: calc(100% - 1px);
    left: 50%;
    width: calc(4 * var(--wp));
    height: calc(4 * var(--wp));
    background: #fff;
  }
  @media (prefers-reduced-motion: no-preference) {
    /* pops in, then bobs one world pixel up and back down while it stays */
    .talk-bubble {
      animation:
        bubble-pop 180ms steps(3) both,
        bubble-bob 1.2s step-end 180ms infinite;
      transform-origin: 50% 100%;
    }
    @keyframes bubble-pop {
      from {
        scale: 0.6;
        opacity: 0;
      }
    }
    @keyframes bubble-bob {
      50% {
        translate: 0 calc(-1 * var(--wp));
      }
    }
  }
  .levelup {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(15 23 14 / 0.5);
  }
  .levelup .card {
    width: min(460px, 100%);
    padding: 22px;
    display: grid;
    gap: 10px;
    justify-items: center;
    text-align: center;
  }
  .levelup h2 {
    margin: 0;
    font-size: 44px;
    color: var(--coral-2);
    text-shadow: 3px 3px 0 var(--butter);
  }
  .opened-line {
    margin: 0;
    font-size: 18px;
  }
  .hint-bubble {
    position: absolute;
    z-index: 3;
    transform: translate(-50%, calc(-100% - 10px));
    max-width: 260px;
    margin: 0;
    padding: 8px 12px;
    background: var(--paper);
    color: var(--text);
    box-shadow: inset 0 0 0 3px var(--outline);
    font-size: 14px;
    line-height: 1.35;
    pointer-events: none;
  }
  .levelup ul {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 18px;
  }
  .levelup li {
    margin: 4px 0;
  }
  .levelup .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }
  @media (prefers-reduced-motion: no-preference) {
    .levelup .card {
      animation: rise 420ms ease-out;
    }
    @keyframes rise {
      from {
        transform: translateY(16px) scale(0.96);
        opacity: 0;
      }
    }
  }
</style>
