import type { Progress } from "../learning/types";
import { queueSync } from "./sync.svelte";
import { loadProgress, saveProgress } from "./storage";

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = browserStorage();
const loaded = loadProgress(storage);

export const game = $state({ progress: loaded.progress, persistent: loaded.persistent });

export function update(change: (p: Progress) => Progress): void {
  const before = game.progress;
  game.progress = change(game.progress);
  if (!saveProgress(storage, $state.snapshot(game.progress) as Progress)) game.persistent = false;
  queueSync(before, game.progress);
}
