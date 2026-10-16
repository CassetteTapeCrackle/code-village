import { env } from "cloudflare:workers";
import { expect, test } from "vitest";
import { bundle } from "../../src/content/bundle";
import { lessonTasks } from "../../src/learning/progress";
import { RULES } from "../../src/tutor/packet";
import { handle } from "../src/router";

const okDeps = { verifyHuman: async () => true, now: () => new Date("2026-10-15T12:00:00Z") };
const REVOKED = "This agent token was revoked. Make a new one in the game.";
const JSON_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };

function request(path: string, body: unknown, token?: string): Request {
  return new Request(`https://x${path}`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

async function registerPlayer(nickname: string, ip: string): Promise<string> {
  const res = await handle(
    new Request("https://x/api/register", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify({ nickname, turnstile: "t" }),
    }),
    env,
    okDeps,
  );
  return ((await res.json()) as { token: string }).token;
}

async function makeAgent(main: string): Promise<string> {
  const res = await handle(request("/api/agent-token", {}, main), env, okDeps);
  return ((await res.json()) as { token: string }).token;
}

async function seed(main: string, body: { events?: unknown[]; snapshot?: unknown }): Promise<void> {
  const res = await handle(request("/api/sync", body, main), env, okDeps);
  expect(res.status, `sync rejected: ${await res.clone().text()}`).toBe(200);
}

type CallResult = { content: { type: string; text: string }[]; isError?: boolean };

async function rpc<T>(method: string, params: unknown, token: string): Promise<T> {
  const res = await handle(request("/mcp", { jsonrpc: "2.0", id: 1, method, params }, token), env, okDeps);
  expect(res.status, `mcp ${method} gave ${res.status}`).toBe(200);
  const text = await res.text();
  const payload = res.headers.get("content-type")?.includes("text/event-stream")
    ? (text.split("\n").find((line) => line.startsWith("data: ")) ?? "").slice(6)
    : text;
  const body = JSON.parse(payload) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`mcp ${method}: ${body.error.message}`);
  return body.result as T;
}

async function callTool(name: string, args: unknown, token: string): Promise<CallResult> {
  return rpc<CallResult>("tools/call", { name, arguments: args }, token);
}

const textOf = (result: CallResult): string => result.content.map((c) => c.text).join("\n");

async function agentFor(nickname: string, ip: string): Promise<string> {
  return makeAgent(await registerPlayer(nickname, ip));
}

const w1Lesson = bundle.lessons.find((l) => l.world === "w1")!;
const w1Task = lessonTasks(w1Lesson)[0];
const lockedLesson = bundle.lessons.find((l) => l.world === "w2")!;

test("tools/list returns exactly the three read-only tools", async () => {
  const agent = await agentFor("Maple", "10.2.0.1");
  const result = await rpc<{ tools: { name: string }[] }>("tools/list", {}, agent);
  expect(result.tools.map((t) => t.name).sort()).toEqual(["get_current_task", "get_lesson", "get_progress"]);
});

test("initialize answers with the server name, as a real client's first request", async () => {
  const agent = await agentFor("Juniper", "10.2.0.12");
  const result = await rpc<{ serverInfo: { name: string }; protocolVersion: string }>(
    "initialize",
    { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0.0" } },
    agent,
  );
  expect(result.serverInfo.name).toBe("code-village");
  expect(result.protocolVersion).toBeTruthy();
});

test("get_current_task puts the rules first and carries the snapshot's code", async () => {
  const main = await registerPlayer("Otter", "10.2.0.2");
  const agent = await makeAgent(main);
  const code = "def greet():\n    return 'snapshot code'";
  await seed(main, {
    events: [],
    snapshot: {
      taskId: w1Task.id,
      code,
      check: {
        error: null,
        results: [{ name: "test_greet", passed: false, message: "expected 'snapshot code'" }],
      },
      checks: 3,
      hints: 1,
    },
  });
  const text = textOf(await callTool("get_current_task", {}, agent));
  expect(text.startsWith(RULES)).toBe(true);
  expect(text).toContain(code);
  expect(text).toContain("3");
});

test("get_current_task without a snapshot asks for a Check first", async () => {
  const agent = await agentFor("Fern", "10.2.0.3");
  const text = textOf(await callTool("get_current_task", {}, agent));
  expect(text).toContain("Press Check in the game first, then ask again.");
});

test("get_lesson returns open lessons as text and refuses unknown or locked ids", async () => {
  const agent = await agentFor("Pine", "10.2.0.4");
  const open = await callTool("get_lesson", { id: w1Lesson.id }, agent);
  expect(open.isError).toBeFalsy();
  const text = textOf(open);
  expect(text).toContain(w1Lesson.title);
  expect(text).toContain(w1Task.title);
  expect(text).toContain(w1Task.prompt);
  for (const task of lessonTasks(w1Lesson)) {
    expect(text).not.toContain(firstLine(task.tests));
  }
  for (const id of ["no-such-lesson", lockedLesson.id]) {
    const refused = await callTool("get_lesson", { id }, agent);
    expect(refused.isError).toBe(true);
    expect(textOf(refused)).toBe("No open lesson has that id.");
  }
});

test("get_progress reports level, the next lesson and weak spots", async () => {
  const main = await registerPlayer("Birch", "10.2.0.5");
  const agent = await makeAgent(main);
  await seed(main, {
    events: [{ kind: "task_passed", id: w1Task.id, at: "2026-10-14", hints: 2, code: "pass" }],
  });
  const text = textOf(await callTool("get_progress", {}, agent));
  expect(text).toContain("Next lesson:");
  expect(text).toContain(w1Task.title);
  expect(text).toContain("2 hints");
});

test("an agent token used on /mcp after revoking is refused with the revoked message", async () => {
  const main = await registerPlayer("Ash", "10.2.0.6");
  const agent = await makeAgent(main);
  const revoke = await handle(
    new Request("https://x/api/agent-token", {
      method: "DELETE",
      headers: { authorization: `Bearer ${main}` },
    }),
    env,
    okDeps,
  );
  expect(revoke.status).toBe(204);
  const res = await handle(
    request("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }, agent),
    env,
    okDeps,
  );
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: REVOKED });
});

test("a main token cannot open /mcp", async () => {
  const main = await registerPlayer("Rowan", "10.2.0.7");
  const res = await handle(
    request("/mcp", { jsonrpc: "2.0", id: 1, method: "tools/list" }, main),
    env,
    okDeps,
  );
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: REVOKED });
});

test("the tutor prompt carries the Socratic rules", async () => {
  const agent = await agentFor("Ivy", "10.2.0.8");
  const listed = await rpc<{ prompts: { name: string }[] }>("prompts/list", {}, agent);
  expect(listed.prompts.map((p) => p.name)).toContain("tutor");
  const got = await rpc<{ messages: { role: string; content: { type: string; text: string } }[] }>(
    "prompts/get",
    { name: "tutor" },
    agent,
  );
  expect(got.messages.map((m) => m.content.text).join("\n")).toContain(RULES);
});

test("one learner's agent never sees another learner's snapshot", async () => {
  const mainA = await registerPlayer("Lark", "10.2.0.9");
  const mainB = await registerPlayer("Wren", "10.2.0.10");
  const agentA = await makeAgent(mainA);
  const agentB = await makeAgent(mainB);
  await seed(mainA, {
    events: [],
    snapshot: { taskId: w1Task.id, code: "print('learner A code')", check: null, checks: 1, hints: 0 },
  });
  await seed(mainB, {
    events: [],
    snapshot: { taskId: w1Task.id, code: "print('learner B code')", check: null, checks: 1, hints: 0 },
  });
  const textA = textOf(await callTool("get_current_task", {}, agentA));
  const textB = textOf(await callTool("get_current_task", {}, agentB));
  expect(textA).toContain("learner A code");
  expect(textA).not.toContain("learner B code");
  expect(textB).toContain("learner B code");
  expect(textB).not.toContain("learner A code");
});

function firstLine(text: string): string {
  return text.split("\n").find((line) => line.trim().length > 0) ?? "";
}

test("no tool output leaks a task's tests source, in any world and with a failing check result", async () => {
  const main = await registerPlayer("Hazel", "10.2.0.11");
  const agent = await makeAgent(main);
  for (const world of new Set(bundle.lessons.map((l) => l.world))) {
    const lesson = bundle.lessons.find((l) => l.world === world)!;
    const task = lessonTasks(lesson)[0];
    await seed(main, {
      events: [],
      snapshot: {
        taskId: task.id,
        code: "pass",
        // a failing result: its message carries test output, so check the tests source never rides along
        check: {
          error: null,
          results: [{ name: "test_x", passed: false, message: "AssertionError: 6.5 != 10.0" }],
        },
        checks: 1,
        hints: 0,
      },
    });
    const outputs = [
      textOf(await callTool("get_current_task", {}, agent)),
      textOf(await callTool("get_lesson", { id: lesson.id }, agent)),
    ];
    for (const other of lessonTasks(lesson)) {
      for (const output of outputs) expect(output).not.toContain(firstLine(other.tests));
    }
  }
});
