import type { Bundle } from "../content/types";
import { conceptName } from "../content/bundle";
import { bossOpen } from "../learning/access";
import { bossState } from "../learning/boss";
import { isWilting } from "../learning/plants";
import { dueReviews } from "../learning/review";
import type { Day, Progress } from "../learning/types";
import { lairName } from "./layout";

export type TalkContext = {
  wilting: string[];
  due: number;
  openBoss: string | null;
  nextLesson: string | null;
};

export function talkContext(bundle: Bundle, p: Progress, day: Day): TalkContext {
  const concepts = new Set(bundle.lessons.flatMap((l) => l.concepts));
  const wilting = Object.entries(p.plants)
    .filter(([concept, plant]) => concepts.has(concept) && isWilting(plant, day))
    .map(([concept]) => conceptName(bundle, concept)); // the nudge shows names, never ids
  const awake = bundle.bosses.find((b) => bossOpen(bundle, p, b) && !bossState(p, b.id).wonAt);
  return {
    wilting,
    due: dueReviews(bundle, p, day).length,
    openBoss: awake ? lairName(awake.world, awake.region) : null,
    nextLesson: bundle.lessons.find((l) => !p.lessons[l.id])?.title ?? null,
  };
}

// A gentle nudge when something needs attention, most urgent first; villagers slip it between their own lines.
export function nudgeFor(ctx: TalkContext): string | null {
  if (ctx.wilting.length > 0)
    return `Your ${ctx.wilting[0]} plant looks thirsty. The garden is just past the square.`;
  if (ctx.due > 0)
    return `${ctx.due} ${ctx.due === 1 ? "plant is" : "plants are"} ready for review in the garden.`;
  if (ctx.openBoss) return `Something stirs in the ${ctx.openBoss}. I think it is waiting for you.`;
  return null;
}
