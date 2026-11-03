import { z } from "zod";
import { bundle } from "../../../src/content/bundle";
import { MAX_CODE_CHARS } from "../../../src/sync/events";
import { sha256Hex } from "../crypto";
import type { Deps, Env } from "../env";
import { fail, json, readBody } from "../http";
import { LIMITS, takeIpSlot } from "../limits";
import { knownTask } from "./sync";

// Learner input crosses a trust boundary here: every field is bounded, and the item must exist
// in the bundle so a report can never title an issue with arbitrary text.
const ReportBody = z.object({
  kind: z.enum(["button", "auto"]),
  item: z.string().refine(isReportableItem),
  code: z.string().max(MAX_CODE_CHARS),
  message: z.string().max(LIMITS.maxReportMessageChars).optional(),
  build: z.string().regex(/^[A-Za-z0-9._-]{1,40}$/),
  turnstile: z.string().optional(),
});
type ReportBody = z.infer<typeof ReportBody>;

function isReportableItem(id: string): boolean {
  return (
    bundle.lessons.some((lesson) => lesson.id === id) ||
    knownTask(id) ||
    bundle.bosses.some((boss) => boss.id === id || boss.stages.some((stage) => stage.id === id))
  );
}

const dayOf = (d: Date): string => d.toISOString().slice(0, 10);
const ipOf = (r: Request): string | null => r.headers.get("cf-connecting-ip");

// Whitespace a learner cannot see must not split one bug into many issues.
export function normalizeReportCode(code: string): string {
  return code
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== "")
    .join("\n");
}

// A fence longer than any backtick run inside keeps learner text from closing the block
// and turning into markdown (mentions, links, images) on the issue.
function fenced(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${text}\n${fence}`;
}

function issueText(report: ReportBody): { title: string; body: string; labels: string[] } {
  const source = report.kind === "button" ? "Report button" : "Automatic report";
  const lines = [
    `${source} on \`${report.item}\`, build \`${report.build}\`.`,
    "",
    "Code:",
    fenced(report.code),
  ];
  if (report.message) lines.push("", "Message:", fenced(report.message));
  return {
    title: `Report: ${report.item}`,
    body: lines.join("\n"),
    labels: ["report", `report:${report.kind}`],
  };
}

async function issuesOpenedOn(env: Env, day: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM report_issues WHERE day = ?")
    .bind(day)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// shortcut: two identical reports in the same instant can both open an issue; move the claim
// into one conditional INSERT if duplicate issues ever show up.
async function linkIssue(
  env: Env,
  deps: Deps,
  report: ReportBody,
  codeHash: string,
  day: string,
): Promise<void> {
  const known = await env.DB.prepare(
    "UPDATE report_issues SET count = count + 1 WHERE item = ? AND code_hash = ? RETURNING issue",
  )
    .bind(report.item, codeHash)
    .first();
  if (known) return;
  if (!env.GITHUB_ISSUES_TOKEN) return;
  if ((await issuesOpenedOn(env, day)) >= LIMITS.issuesPerDay) return;
  const { title, body, labels } = issueText(report);
  const issue = await deps.openIssue(title, body, labels);
  if (issue === null) return;
  await env.DB.prepare(
    "INSERT INTO report_issues (item, code_hash, issue, count, day) VALUES (?, ?, ?, 1, ?) ON CONFLICT DO NOTHING",
  )
    .bind(report.item, codeHash, issue, day)
    .run();
}

export async function postReport(request: Request, env: Env, deps: Deps): Promise<Response> {
  const raw = await readBody(request, MAX_CODE_CHARS + LIMITS.maxReportMessageChars + 4_000);
  if (raw instanceof Response) return raw;
  const parsed = ReportBody.safeParse(raw);
  if (!parsed.success) return fail(400, "That report is not valid.");
  const report = parsed.data;
  if (report.kind === "button" && !(await deps.verifyHuman(report.turnstile ?? "", ipOf(request))))
    return fail(403, "The human check failed. Try again.");
  const now = deps.now();
  const day = dayOf(now);
  const action = report.kind === "button" ? "report" : "auto-report";
  if (!(await takeIpSlot(env, ipOf(request), action, day)))
    return fail(429, "Too many reports from here today.");
  const codeHash = await sha256Hex(normalizeReportCode(report.code));
  await env.DB.prepare(
    "INSERT INTO reports (at, kind, item, code_hash, code, message, build) VALUES (?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      now.toISOString(),
      report.kind,
      report.item,
      codeHash,
      report.code,
      report.message ?? null,
      report.build,
    )
    .run();
  await linkIssue(env, deps, report, codeHash, day);
  return json({ ok: true }, 201);
}
