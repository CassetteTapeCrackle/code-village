import { game } from "../store/progress.svelte";
import {
  endedTour,
  freshTour,
  markTip,
  nextStep,
  parseTour,
  replayTour,
  shouldStart,
  type TipId,
  type TourState,
} from "./tour";

// The tour keeps one small record on this device, beside the other UI preferences.
const KEY = "code-village/tour";

function browserStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function load(): TourState | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const text = storage.getItem(KEY);
    return text === null ? null : parseTour(JSON.parse(text));
  } catch {
    return null;
  }
}

function save(state: TourState): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    // private mode: the tour lasts until the page reloads
  }
}

// A first visit starts at welcome. Players from before the tour get no guide, but still get the one-time tips.
function initial(): TourState {
  const stored = load();
  if (stored) return stored;
  return shouldStart(null, game.progress) ? freshTour() : endedTour();
}

export const tour: { state: TourState } = $state({ state: initial() });

export function tourEvent(event: string): void {
  const next = nextStep(tour.state, event);
  if (next === tour.state) return;
  tour.state = next;
  save(next);
}

export function restartTour(): void {
  tour.state = replayTour(tour.state);
  save(tour.state);
}

export function noteTip(id: TipId): void {
  const next = markTip(tour.state, id);
  if (next === tour.state) return;
  tour.state = next;
  save(next);
}
