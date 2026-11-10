import type { Boss, Bundle, Exercise, Lesson, Task } from "../content/types";

function exercise(id: string, concept: string): Exercise {
  return { id, concept, title: id, prompt: "", starter: "", tests: "", cases: [], requires: [] };
}

export function task(id: string, concept: string, variants: string[] = []): Task {
  return {
    ...exercise(id, concept),
    kind: "write",
    hints: ["h"],
    gotcha: false,
    variants: variants.map((v) => exercise(v, concept)),
  };
}

export function lesson(id: string, region: string, concepts: string[], tasks: Task[], world = "w1"): Lesson {
  return {
    id,
    title: id,
    world,
    region,
    order: 1,
    concepts,
    remember: [`${id} rule`],
    loot: { id: `${id}-loot`, name: `${id} loot` },
    blocks: tasks.map((t) => ({ type: "task" as const, task: t })),
  };
}

function boss(id: string, region: string, stageIds: string[]): Boss {
  return {
    id,
    title: id,
    world: "w1",
    region,
    intro: "",
    starter: "",
    hardTests: "",
    hardCases: [],
    hardRequires: [],
    hardChecks: 2,
    trophy: { id: `${id}-trophy`, name: "Trophy" },
    hardTrophy: { id: `${id}-gold`, name: "Gold" },
    stages: stageIds.map((s) => ({
      id: s,
      title: s,
      prompt: "",
      hp: 10,
      tests: "",
      cases: [],
      requires: [],
    })),
  };
}

// Region a teaches vars and loops; region b teaches lists and has the gradebook boss.
export function testBundle(): Bundle {
  return {
    version: 5,
    python: "3.14",
    concepts: { vars: "values and variables", io: "input and output", loops: "loops", lists: "lists" },
    worlds: [
      {
        id: "w1",
        order: 1,
        name: "The Village",
        area: "village",
        regions: { a: "First programs", b: "Collections" },
        building: { name: "School", placeId: "school" },
        teacher: { name: "Ms. Juniper", portrait: "teacher" },
        key: null,
      },
    ],
    lessons: [
      lesson("vars", "a", ["vars"], [task("vars-1", "vars", ["vars-1b"]), task("vars-2", "vars")]),
      lesson("loops", "a", ["loops"], [task("loops-1", "loops")]),
      lesson(
        "lists",
        "b",
        ["lists"],
        [task("lists-1", "lists", ["lists-1b", "lists-1c"]), task("lists-2", "lists")],
      ),
    ],
    bosses: [boss("gradebook", "b", ["parse", "average", "ranking"])],
  };
}
