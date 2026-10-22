import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { bundle, lessonById } from "../../src/content/bundle";
import type { Lesson, Task } from "../../src/content/types";
import { lessonTasks } from "../../src/learning/progress";
import type { CheckResult } from "../../src/runner/protocol";
import type { SyncEvent } from "../../src/sync/events";
import { progressFromEvents } from "../../src/sync/plausible";
import { scoreFromEvents } from "../../src/sync/score";
import { RULES, taskContext, type Snapshot } from "../../src/tutor/packet";
import { openWorlds, worldById } from "../../src/worlds/registry";
import { playerFor, type Player } from "./auth";
import type { Deps, Env } from "./env";
import { fail } from "./http";
import { rowToEvent, type EventRow } from "./routes/sync";

const REVOKED = "This agent token was revoked. Make a new one in the game.";
const NO_SNAPSHOT = "Press Check in the game first, then ask again.";
const NO_LESSON = "No open lesson has that id.";

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

const text = (body: string) => ({ content: [{ type: "text" as const, text: body }] });
const refuse = (body: string) => ({ ...text(body), isError: true });

type LessonTask = { lesson: Lesson; task: Task };

// The snapshot holds a base task id, or one of its variant ids; both resolve here.
function taskFor(id: string): LessonTask | null {
  for (const lesson of bundle.lessons) {
    for (const task of lessonTasks(lesson)) {
      if (task.id === id) return { lesson, task };
      const variant = task.variants.find((v) => v.id === id);
      if (variant) return { lesson, task: { ...task, ...variant } };
    }
  }
  return null;
}

async function eventsFor(env: Env, playerId: number): Promise<SyncEvent[]> {
  const stored = await env.DB.prepare(
    "SELECT kind, item_id AS id, at, hints, code FROM events WHERE player_id = ?",
  )
    .bind(playerId)
    .all<EventRow>();
  return stored.results.map(rowToEvent).filter((e): e is SyncEvent => e !== null);
}

async function snapshotFor(env: Env, playerId: number): Promise<Snapshot | null> {
  const row = await env.DB.prepare(
    "SELECT task_id, code, check_json, checks, hints FROM snapshots WHERE player_id = ?",
  )
    .bind(playerId)
    .first<{ task_id: string; code: string; check_json: string | null; checks: number; hints: number }>();
  if (!row) return null;
  return {
    taskId: row.task_id,
    code: row.code,
    // stored only after isSnapshot validated the shape
    check: row.check_json === null ? null : (JSON.parse(row.check_json) as CheckResult),
    checks: row.checks,
    hints: row.hints,
  };
}

// The lesson as Markdown: text as is, examples as fenced Python with their output,
// tasks as title and prompt only. Tests and solutions never leave the server.
function lessonMarkdown(lesson: Lesson): string {
  const parts = [`# Lesson: ${lesson.title}`];
  if (lesson.remember.length) parts.push("Remember:", ...lesson.remember.map((line) => `- ${line}`));
  for (const block of lesson.blocks) {
    if (block.type === "text") parts.push(block.markdown);
    else if (block.type === "example")
      parts.push(`\`\`\`python\n${block.code}\n\`\`\``, "Output:", `\`\`\`\n${block.output}\n\`\`\``);
    else if (block.type === "task") parts.push(`## Task: ${block.task.title}`, block.task.prompt);
  }
  return parts.join("\n\n");
}

function progressText(events: SyncEvent[]): string {
  const progress = progressFromEvents(bundle, events);
  const score = scoreFromEvents(bundle, events);
  const open = openWorlds(bundle, progress);
  const next = bundle.lessons.find((l) => open.includes(l.world) && !progress.lessons[l.id]);
  const weak = events
    .filter((e): e is Extract<SyncEvent, { kind: "task_passed" }> => e.kind === "task_passed" && e.hints > 0)
    .sort((a, b) => b.hints - a.hints)
    .slice(0, 5);
  const world = score.furthestWorld
    ? (worldById(score.furthestWorld)?.name ?? score.furthestWorld)
    : "none yet";
  const lines = [
    `Level ${score.level}, ${score.xp} XP.`,
    `Furthest world: ${world}.`,
    next ? `Next lesson: ${next.title} (${next.id}).` : "Next lesson: none open has work left.",
  ];
  if (weak.length) {
    lines.push("Weak spots, passed tasks with the most hints:");
    for (const item of weak) {
      lines.push(`- ${taskFor(item.id)?.task.title ?? item.id} (${item.id}): ${item.hints} hints`);
    }
  } else {
    lines.push("Weak spots: none.");
  }
  return lines.join("\n");
}

function createServer(player: Player, env: Env): McpServer {
  const server = new McpServer({ name: "code-village", version: "1.0.0" });

  server.registerTool(
    "get_current_task",
    { description: "The Socratic rules, then the learner's current task, code and test results." },
    async () => {
      const snapshot = await snapshotFor(env, player.id);
      const found = snapshot ? taskFor(snapshot.taskId) : null;
      if (!snapshot || !found) return text(NO_SNAPSHOT);
      return text(`${RULES}\n\n${taskContext(found.lesson, found.task, snapshot)}`);
    },
  );

  server.registerTool(
    "get_lesson",
    {
      description: "One lesson's text, examples and task statements. Tests and solutions are never included.",
      inputSchema: z.object({ id: z.string().describe("The lesson id, like w1-r1-l1") }),
    },
    async ({ id }) => {
      const lesson = lessonById(id);
      const open = openWorlds(bundle, progressFromEvents(bundle, await eventsFor(env, player.id)));
      if (!lesson || !open.includes(lesson.world)) return refuse(NO_LESSON);
      return text(lessonMarkdown(lesson));
    },
  );

  server.registerTool(
    "get_progress",
    { description: "Level, XP, the next lesson and the tasks passed with the most hints." },
    async () => text(progressText(await eventsFor(env, player.id))),
  );

  server.registerPrompt(
    "tutor",
    { description: "The Socratic rules this village's teacher follows." },
    () => ({ messages: [{ role: "user" as const, content: { type: "text" as const, text: RULES } }] }),
  );

  return server;
}

export async function mcp(request: Request, env: Env, deps: Deps): Promise<Response> {
  const player = await playerFor(request, env, "agent", dayOf(deps.now()));
  if (!player) return fail(401, REVOKED);
  const handler = createMcpHandler(() => createServer(player, env));
  return handler.fetch(request);
}
