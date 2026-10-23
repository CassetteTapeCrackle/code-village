import type { Bundle, Lesson, World } from "../content/types";
import { conceptName } from "../content/bundle";
import { regularLessons } from "../content/lessons";
import { worldById } from "../worlds/registry";
import { lessonTasks } from "./progress";
import type { Progress } from "./types";

// Each world's lessons have their own teacher, named in its world.toml.
export function teacherFor(world: string): World["teacher"] {
  return worldById(world)?.teacher ?? { name: "Ms. Juniper", portrait: "teacher" };
}

// What the teacher says at the schoolhouse door: where to pick up, in that order of priority.
export function teacherGreeting(
  bundle: Bundle,
  p: Progress,
  world = "w1",
): { line: string; lessonId: string | null } {
  const lessons = regularLessons(bundle.lessons).filter((l) => l.world === world);
  const started = lessons.find(
    (l) => !p.lessons[l.id] && lessonTasks(l).some((t) => p.tasks[t.id]?.passedAt),
  );
  if (started)
    return {
      line: `Welcome back! You were halfway through ${started.title}. Shall we pick up where you left off?`,
      lessonId: started.id,
    };
  const next = lessons.find((l) => !p.lessons[l.id]);
  if (next && next === lessons[0])
    return {
      line: `Welcome in! Every lesson ends with code you write yourself. Start with ${next.title}?`,
      lessonId: next.id,
    };
  if (next) return { line: `Good to see you. Next up: ${next.title}.`, lessonId: next.id };
  return {
    line: "You have passed every lesson! The bosses are waiting, and the garden needs you.",
    lessonId: null,
  };
}

export type TaskEvent = "start" | "pass" | "fail" | "error";

// The seed line starts a sentence, so the article is capitalised: "An input and output seed", "A loops seed".
// shortcut: first letter only, fine for these concept names, which have no silent or "you" vowels.
export function article(word: string): "A" | "An" {
  return /^[aeiou]/i.test(word) ? "An" : "A";
}

// The teacher's line on the lesson desk, reacting to the latest Check.
export function teacherLine(
  bundle: Bundle,
  lesson: Lesson,
  passed: number,
  total: number,
  event: TaskEvent,
  nextTitle: string | null,
): string {
  if (passed === total && total > 0) {
    const name = conceptName(bundle, lesson.concepts[0]);
    return `That is the whole lesson! ${article(name)} ${name} seed is on its way to the garden.`;
  }
  if (event === "pass")
    return `Well done! ${passed} of ${total} passed.${nextTitle ? ` Next: ${nextTitle}.` : ""}`;
  if (event === "fail")
    return "Not yet. Read the first red line: it shows what came back and what was expected.";
  if (event === "error")
    return "Python stopped with an error. The last line names it, and the line number shows where.";
  return lesson.remember[0] ?? `Today: ${lesson.title}.`;
}

// The one region a lessons board shows unfolded: where the next lesson is, else where a boss is awake and unbeaten.
export function regionToOpen(bundle: Bundle, p: Progress, world = "w1"): string | null {
  const next = teacherGreeting(bundle, p, world).lessonId;
  const lesson = next ? bundle.lessons.find((l) => l.id === next) : undefined;
  if (lesson) return lesson.region;
  const boss = bundle.bosses.find(
    (b) =>
      b.world === world &&
      !p.bosses[b.id]?.wonAt &&
      bundle.lessons
        .filter((l) => !l.tour && l.world === world && l.region === b.region)
        .every((l) => p.lessons[l.id]),
  );
  return boss?.region ?? null;
}
