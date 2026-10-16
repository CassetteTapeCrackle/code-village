import { addDays, daysBetween } from "./dates";
import type { Day, Plant, PlantStage } from "./types";

const INTERVALS = [1, 3, 7, 21] as const;
export const STAGE_NAMES = ["seed", "sprout", "flowering", "tree"] as const;

export function seedPlant(day: Day): Plant {
  return { stage: 0, due: addDays(day, INTERVALS[0]) };
}

export function reviewPassed(plant: Plant, day: Day): Plant {
  const stage = Math.min(3, plant.stage + 1) as PlantStage;
  return { stage, due: addDays(day, INTERVALS[stage]) };
}

export function reviewFailed(plant: Plant, day: Day): Plant {
  return { stage: Math.max(0, plant.stage - 1) as PlantStage, due: addDays(day, 1) };
}

export function isDue(plant: Plant, day: Day): boolean {
  return daysBetween(plant.due, day) >= 0;
}

export function isWilting(plant: Plant, day: Day): boolean {
  return daysBetween(plant.due, day) >= 2;
}
