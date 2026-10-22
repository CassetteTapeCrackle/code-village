import type { Progress } from "../learning/types";
import { parseRoute } from "../route";

// The first-visit tour: a short list of steps, each with one target on screen and one way to finish.
// Screens fire events by name; the tour ignores any event that is not the current step's, so wandering off
// mid-step only makes it wait.
export type TourStepId =
  | "welcome"
  | "walk-anywhere"
  | "walk-building"
  | "lesson-list"
  | "run"
  | "check"
  | "ask-tutor"
  | "grows"
  | "join-board"
  | "recovery"
  | "connect"
  | "goodbye";

export type TipId = "garden" | "library" | "house" | "sandbox" | "board" | "today";

export type TourState = {
  step: TourStepId;
  done: boolean;
  skipped: boolean;
  joined: boolean;
  recoverySaved: boolean;
  seenTips: TipId[];
};

export type TourStep = {
  id: TourStepId;
  target: string | null; // a [data-tour] element, or a [data-place] on the map
  text: string;
  mochi?: string;
  done: TourStepId | "next";
  allowNext?: boolean;
  nextLabel?: string;
  at?: string; // where "Take me back" goes while this step waits
  place?: boolean; // target is a map place, so Mochi points at it with a bubble
};

export const TOUR_LESSON_ID = "hello-village";
export const TOUR_TASK_ID = "tour-hello";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "school",
    place: true,
    text: "Welcome to Code Village. I am Ms. Juniper, and Mochi has come along to help. Let me show you the first few things.",
    mochi: "Hello!",
    done: "next",
    at: "#/",
  },
  {
    id: "walk-anywhere",
    target: null,
    text: "Click any patch of grass and Mochi will walk there. Try it once.",
    done: "walk-anywhere",
    at: "#/",
  },
  {
    id: "walk-building",
    target: "school",
    place: true,
    text: "Now click a building to go there. The school is a good first stop.",
    mochi: "This way!",
    done: "walk-building",
    at: "#/",
  },
  {
    id: "lesson-list",
    target: "tour-lesson",
    text: "Every lesson lives on this board. Your first one is ready. Open it when you like.",
    done: "lesson-list",
    allowNext: true,
    at: "#/school",
  },
  {
    id: "run",
    target: "run",
    text: "Replace NAME with your name, then press Run.",
    done: "run",
    at: `#/lesson/${TOUR_LESSON_ID}`,
  },
  {
    id: "check",
    target: "check",
    text: "Run tries your code. Check tests it against the task. Press Check and see.",
    done: "check",
    at: `#/lesson/${TOUR_LESSON_ID}`,
  },
  {
    id: "ask-tutor",
    target: "tutor",
    text: "Stuck? Ask the teacher. One question is enough for now, and Next is always there.",
    done: "ask-tutor",
    allowNext: true,
    at: `#/lesson/${TOUR_LESSON_ID}`,
  },
  {
    id: "grows",
    target: "xp",
    text: "XP grows your village and opens new places. A lair wakes when its region is done, and the last boss opens the road to the forest. Already know a world? Its last boss can test you out of it.",
    done: "next",
    at: "#/",
  },
  {
    id: "join-board",
    target: "profile",
    text: "At your house you can join the village board with a nickname. Join now, or choose Later.",
    done: "join-board",
    allowNext: true,
    nextLabel: "Later",
    at: "#/house",
  },
  {
    id: "recovery",
    target: "recovery",
    text: "This recovery code is shown once. Tick the box when you have saved it somewhere safe.",
    done: "recovery",
    at: "#/house",
  },
  {
    id: "connect",
    target: "connect",
    text: "If you use Claude Code, Codex or opencode, connect it here. Skipping is fine.",
    done: "next",
    at: "#/house",
  },
  {
    id: "goodbye",
    target: null,
    text: "That is the whole tour. You can replay it from your house whenever you like. Have fun!",
    done: "next",
  },
];

// Where the way-back chip sends you, in words: "on the map", "at the school", "in the lesson".
export function waitingAt(at: string): string {
  const route = parseRoute(at).name;
  if (route === "home") return "on the map";
  if (route === "lesson") return "in the lesson";
  if (route === "boss") return "in the lair";
  if (route === "school") return "at the school";
  if (route === "house") return "at the house";
  if (route === "board") return "on the board";
  if (route === "cheat") return "in the village";
  return `in the ${route}`;
}

export type CardBox = { left: number; top: number; width: number; height: number };
export type CardSpot = { right: boolean; top: boolean };

// The card sits on the side the target is not, so it never covers what it points at. On a place, though, the
// target is often high on the right, and that put the card over the title and first instructions: there it
// keeps to the bottom left instead, below the Remember box when the page leaves room. Phones keep the old rule.
export function cardSpot(
  here: string,
  target: CardBox | null,
  viewport: { width: number; height: number },
): CardSpot {
  const onMap = here === "";
  const phone = viewport.width <= 760;
  if (!onMap && !phone) return { right: false, top: false };
  if (!target) return { right: false, top: false };
  return {
    right: target.left + target.width / 2 < viewport.width / 2,
    top: target.top + target.height / 2 > viewport.height / 2,
  };
}

export const TIP_TEXT: Record<TipId, string> = {
  garden: "The garden grows a plant for every concept you pass.",
  library: "The library keeps a recap of every lesson you finish.",
  house: "Your house holds your finds, your saves and the board.",
  sandbox: "The sandbox is a quiet place to try code on your own.",
  board: "The board shows what the village is learning.",
  today: "Today says what to do next.",
};

const stepById = (id: TourStepId): TourStep | undefined => TOUR_STEPS.find((s) => s.id === id);
const isStepId = (value: string): value is TourStepId => TOUR_STEPS.some((s) => s.id === value);
const isTipId = (value: string): value is TipId => value in TIP_TEXT;

export function freshTour(): TourState {
  return {
    step: "welcome",
    done: false,
    skipped: false,
    joined: false,
    recoverySaved: false,
    seenTips: [],
  };
}

export function endedTour(): TourState {
  return { ...freshTour(), done: true };
}

export function hasPassedTask(progress: Progress): boolean {
  return Object.values(progress.tasks).some((task) => task.passedAt !== null);
}

// Only a device with no tour state and no passed task has a first visit to guide.
export function shouldStart(stored: TourState | null, progress: Progress): boolean {
  return stored === null && !hasPassedTask(progress);
}

function advance(state: TourState): TourState {
  const index = TOUR_STEPS.findIndex((s) => s.id === state.step);
  let next = index + 1;
  // Skipping the board means there is no recovery code to save.
  while (next < TOUR_STEPS.length && TOUR_STEPS[next].id === "recovery" && !state.joined) next += 1;
  if (next >= TOUR_STEPS.length) return { ...state, step: "goodbye", done: true };
  return { ...state, step: TOUR_STEPS[next].id };
}

export function nextStep(state: TourState, event: string): TourState {
  if (state.done || state.skipped) return state;
  const step = stepById(state.step);
  if (!step) return state;
  if (event === "skip") return { ...state, done: true, skipped: true };
  let next = state;
  if (event === "join-board" && step.id === "join-board") next = { ...next, joined: true };
  if (event === "recovery" && step.id === "recovery") next = { ...next, recoverySaved: true };
  const moves = event === step.done || (event === "next" && step.allowNext === true);
  if (!moves) return state;
  return advance(next);
}

export function replayTour(state: TourState): TourState {
  const seen = state.seenTips;
  return { ...freshTour(), seenTips: seen };
}

// The tips live with the tour state, so one device remembers which ones it has shown.
export function markTip(state: TourState, id: TipId): TourState {
  if (state.seenTips.includes(id)) return state;
  return { ...state, seenTips: [...state.seenTips, id] };
}

export function tipForHash(hash: string): TipId | null {
  const [, place = ""] = hash.split("/");
  if (place === "" || place === "#") return "today";
  if (place === "garden") return "garden";
  if (place === "library") return "library";
  if (place === "house") return "house";
  if (place === "sandbox") return "sandbox";
  if (place === "board") return "board";
  return null;
}

export function unseenTip(state: TourState, hash: string): TipId | null {
  if (!state.done && !state.skipped) return null;
  const id = tipForHash(hash);
  return id && !state.seenTips.includes(id) ? id : null;
}

export function parseTour(raw: unknown): TourState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.step !== "string" || !isStepId(v.step)) return null;
  return {
    step: v.step,
    done: v.done === true,
    skipped: v.skipped === true,
    joined: v.joined === true,
    recoverySaved: v.recoverySaved === true,
    seenTips: Array.isArray(v.seenTips)
      ? v.seenTips.filter((t): t is TipId => typeof t === "string" && isTipId(t))
      : [],
  };
}
