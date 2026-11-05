import { env } from "cloudflare:workers";
import { beforeEach, expect, test } from "vitest";
import { MAX_CODE_CHARS } from "../../src/sync/events";
import type { Deps } from "../src/env";
import { openGithubIssue } from "../src/github";
import { LIMITS } from "../src/limits";
import { UNTRUSTED_NOTICE } from "../src/routes/report";
import { handle } from "../src/router";

const NOW = new Date("2026-10-15T12:00:00Z");
const TASK = "tour-hello";
const LESSON = "hello-village";

type OpenedIssue = { title: string; body: string; labels: string[] };

function fakeDeps(opened: OpenedIssue[], human = true): Deps {
  let next = 100;
  return {
    verifyHuman: async (token) => human && token === "ok",
    now: () => NOW,
    askModel: async () => new ReadableStream<string>({ start: (c) => c.close() }),
    waitUntil: () => {},
    openIssue: async (title, body, labels) => {
      opened.push({ title, body, labels });
      return next++;
    },
  };
}

function report(
  body: Record<string, unknown>,
  ip = "10.1.0.1",
  headers: Record<string, string> = {},
): Request {
  return new Request("https://x/api/report", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip, ...headers },
    body: JSON.stringify(body),
  });
}

const button = (code: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: "button",
  item: TASK,
  code,
  build: "abc123def456",
  turnstile: "ok",
  ...extra,
});
const auto = (code: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  kind: "auto",
  item: TASK,
  code,
  message: "expected 7, got 3",
  build: "abc123def456",
  ...extra,
});

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM reports"),
    env.DB.prepare("DELETE FROM report_issues"),
    env.DB.prepare("DELETE FROM ip_buckets"),
  ]);
});

async function reportCount(): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports").first<{ n: number }>();
  return row?.n ?? 0;
}

test("a button report is stored and opens one issue", async () => {
  const opened: OpenedIssue[] = [];
  const res = await handle(
    report(button("print('hi')", { message: "Check refused this" })),
    env,
    fakeDeps(opened),
  );
  expect(res.status).toBe(201);
  expect(await reportCount()).toBe(1);
  expect(opened).toHaveLength(1);
  expect(opened[0].title).toContain(TASK);
  // agents read these issues: the learner's text must arrive marked as data, before any of it
  expect(opened[0].body.split("\n")[0]).toBe(UNTRUSTED_NOTICE);
  expect(opened[0].body).toContain("print('hi')");
  expect(opened[0].body).toContain("Check refused this");
  expect(opened[0].labels).toContain("report");
  const link = await env.DB.prepare("SELECT issue, count FROM report_issues").first();
  expect(link).toEqual({ issue: 100, count: 1 });
});

test("dedupes_same_item_and_code", async () => {
  const opened: OpenedIssue[] = [];
  const deps = fakeDeps(opened);
  await handle(report(button("x = 1\n")), env, deps);
  // trailing spaces, blank lines and Windows line ends do not make a new issue
  await handle(report(button("x = 1   \r\n\r\n")), env, deps);
  await handle(report(auto("x = 1")), env, deps);
  expect(opened).toHaveLength(1);
  expect(await reportCount()).toBe(3);
  const link = await env.DB.prepare("SELECT count FROM report_issues").first<{ count: number }>();
  expect(link?.count).toBe(3);
  await handle(report(button("x = 2")), env, deps);
  expect(opened).toHaveLength(2);
});

test("daily_issue_cap", async () => {
  const opened: OpenedIssue[] = [];
  const deps = fakeDeps(opened);
  for (let i = 0; i <= LIMITS.issuesPerDay; i++) {
    // a fresh IP each time, so only the issue cap is in play
    const res = await handle(report(auto(`x = ${i}`), `10.2.0.${i}`), env, deps);
    expect(res.status).toBe(201);
  }
  expect(opened).toHaveLength(LIMITS.issuesPerDay);
  expect(await reportCount()).toBe(LIMITS.issuesPerDay + 1);
});

test("button_needs_turnstile", async () => {
  const opened: OpenedIssue[] = [];
  const res = await handle(report(button("x = 1", { turnstile: "bad" })), env, fakeDeps(opened));
  expect(res.status).toBe(403);
  const missing = await handle(report(button("x = 1", { turnstile: undefined })), env, fakeDeps(opened));
  expect(missing.status).toBe(403);
  expect(await reportCount()).toBe(0);
  expect(opened).toHaveLength(0);
});

test("an auto report needs no Turnstile token", async () => {
  const res = await handle(report(auto("x = 1")), env, fakeDeps([], false));
  expect(res.status).toBe(201);
});

test("auto_report_has_no_identity", async () => {
  const signedIn = { authorization: "Bearer some-device-token" };
  await handle(report(auto("x = 1", { nickname: "Maple" }), "10.3.0.1", signedIn), env, fakeDeps([]));
  const row = await env.DB.prepare("SELECT * FROM reports").first<Record<string, unknown>>();
  expect(Object.keys(row ?? {}).sort()).toEqual(
    ["at", "build", "code", "code_hash", "id", "item", "kind", "message"].sort(),
  );
  expect(JSON.stringify(row)).not.toContain("Maple");
  expect(JSON.stringify(row)).not.toContain("some-device-token");
  expect(JSON.stringify(row)).not.toContain("10.3.0.1");
});

test("rate_limited", async () => {
  const deps = fakeDeps([]);
  for (let i = 0; i < LIMITS.reportPerIpPerDay; i++) {
    expect((await handle(report(button(`x = ${i}`)), env, deps)).status).toBe(201);
  }
  expect((await handle(report(button("x = 99")), env, deps)).status).toBe(429);
  // auto reports count separately
  for (let i = 0; i < LIMITS.autoReportPerIpPerDay; i++) {
    expect((await handle(report(auto(`y = ${i}`)), env, deps)).status).toBe(201);
  }
  expect((await handle(report(auto("y = 99")), env, deps)).status).toBe(429);
});

test("no_token_stores_only", async () => {
  const opened: OpenedIssue[] = [];
  const noToken = { ...env, GITHUB_ISSUES_TOKEN: "" };
  const res = await handle(report(button("x = 1")), noToken, fakeDeps(opened));
  expect(res.status).toBe(201);
  expect(await reportCount()).toBe(1);
  expect(opened).toHaveLength(0);
});

test("a failed issue call still stores the report, and a later duplicate tries again", async () => {
  const deps = { ...fakeDeps([]), openIssue: async () => null };
  expect((await handle(report(button("x = 1")), env, deps)).status).toBe(201);
  const opened: OpenedIssue[] = [];
  await handle(report(button("x = 1")), env, fakeDeps(opened));
  expect(opened).toHaveLength(1);
  expect(await reportCount()).toBe(2);
});

test("a report on a lesson, a boss or a stage is accepted, an unknown item is refused", async () => {
  const deps = fakeDeps([]);
  for (const item of [LESSON, "guessing-stone", "guessing-hint"]) {
    expect((await handle(report(button("", { item })), env, deps)).status).toBe(201);
  }
  expect((await handle(report(button("x", { item: "no-such-item" })), env, deps)).status).toBe(400);
});

test("bad shapes are refused before anything is stored", async () => {
  const deps = fakeDeps([]);
  const bad = [
    button("x", { kind: "other" }),
    button("x".repeat(MAX_CODE_CHARS + 1)),
    button("x", { message: "m".repeat(LIMITS.maxReportMessageChars + 1) }),
    button("x", { build: "" }),
    button("x", { build: "a b" }),
    button("x", { code: 5 }),
  ];
  for (const body of bad) expect((await handle(report(body), env, deps)).status).toBe(400);
  expect(await reportCount()).toBe(0);
});

test("the issue body fences learner text so it cannot break out into markdown", async () => {
  const opened: OpenedIssue[] = [];
  const code = "s = '```'\n@owner look";
  await handle(report(button(code, { message: "```\n@someone ping" })), env, fakeDeps(opened));
  const body = opened[0].body;
  expect(body).toContain("````\ns = '```'\n@owner look\n````");
  expect(body).toContain("````\n```\n@someone ping\n````");
});

test("openGithubIssue posts to the repo issues endpoint and returns the number", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = async (url: string, init: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ number: 42 }), { status: 201 });
  };
  const issue = await openGithubIssue("tok", "T", "B", ["report"], fakeFetch);
  expect(issue).toBe(42);
  expect(calls[0].url).toBe("https://api.github.com/repos/CassetteTapeCrackle/code-village-reports/issues");
  expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer tok");
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ title: "T", body: "B", labels: ["report"] });
});

test("openGithubIssue returns null when GitHub refuses or the network fails", async () => {
  const refused = async (): Promise<Response> => new Response("{}", { status: 403 });
  expect(await openGithubIssue("tok", "T", "B", [], refused)).toBeNull();
  const broken = async (): Promise<Response> => {
    throw new Error("offline");
  };
  expect(await openGithubIssue("tok", "T", "B", [], broken)).toBeNull();
});

test("code at the cap that JSON escaping doubles is still accepted", async () => {
  const res = await handle(report(button("\n".repeat(MAX_CODE_CHARS))), env, fakeDeps([]));
  expect(res.status).toBe(201);
});

test("the daily issue cap starts over the next day", async () => {
  const opened: OpenedIssue[] = [];
  const today = fakeDeps(opened);
  for (let i = 0; i < LIMITS.issuesPerDay; i++)
    await handle(report(auto(`x = ${i}`), `10.4.0.${i}`), env, today);
  const tomorrow = { ...fakeDeps(opened), now: () => new Date("2026-10-16T12:00:00Z") };
  await handle(report(auto("x = new"), "10.4.1.1"), env, tomorrow);
  expect(opened).toHaveLength(LIMITS.issuesPerDay + 1);
});

test("a failed human check does not use up the IP's report slots", async () => {
  const refused = fakeDeps([]);
  for (let i = 0; i < LIMITS.reportPerIpPerDay + 2; i++) {
    await handle(report(button("x", { turnstile: "bad" })), env, refused);
  }
  expect((await handle(report(button("x")), env, fakeDeps([]))).status).toBe(201);
});
