import type { Bundle } from "../content/types";
import { STAGE_NAMES, isDue, isWilting } from "./plants";
import type { Day, Plant, Progress } from "./types";

type BedStage = (typeof STAGE_NAMES)[number] | "wilting";
export type Bed = {
  concept: string;
  world: string;
  region: string;
  lessonId: string;
  plant: Plant | null;
  stage: BedStage | null;
  due: boolean;
};

// One bed per concept, in course order; a concept's region and lesson are where it is taught.
export function gardenBeds(bundle: Bundle, p: Progress, day: Day): Bed[] {
  const beds: Bed[] = [];
  for (const lesson of bundle.lessons) {
    for (const concept of lesson.concepts) {
      if (beds.some((b) => b.concept === concept)) continue;
      const plant = p.plants[concept] ?? null;
      const stage = plant ? (isWilting(plant, day) ? "wilting" : STAGE_NAMES[plant.stage]) : null;
      beds.push({
        concept,
        world: lesson.world,
        region: lesson.region,
        lessonId: lesson.id,
        plant,
        stage,
        due: plant ? isDue(plant, day) : false,
      });
    }
  }
  return beds;
}

export function bedStatus(bed: Bed): string {
  if (!bed.plant) return "Not planted yet: pass its lesson to plant a seed.";
  const stage = STAGE_NAMES[bed.plant.stage];
  if (bed.stage === "wilting")
    return `A ${stage}, wilting: it was due on ${bed.plant.due}. Water it to perk it up.`;
  if (bed.due) return `A ${stage}, due today.`;
  return `A ${stage}. Next watering on ${bed.plant.due}.`;
}
