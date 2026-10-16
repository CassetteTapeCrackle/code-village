// Bake-off for the built-in tutor's model. Run by hand (see README.md), never in CI:
// it calls the real Workers AI API and needs Cloudflare credentials.
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tutorMessages } from "../../src/tutor/packet.ts";
import { limitParam } from "../../src/tutor/models.ts";
// the Worker's own chunk parser, so the bake-off reads model output exactly as the app does
import { textFromChunk } from "../../worker/src/aiStream.ts";

// Candidates, cheapest first. Gemma and both gpt-oss models are reasoning models: their
// thinking shares the token budget with the reply, so replies can come back empty or cut
// short; the scorer notes those.
const MODELS = [
  "@cf/google/gemma-4-26b-a4b-it",
  "@cf/openai/gpt-oss-20b",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  "@cf/openai/gpt-oss-120b",
];

const MAX_TOKENS = 300;
const MISSING = "Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to run the bake-off.";
const HERE = dirname(fileURLToPath(import.meta.url));

export function findTask(bundle, taskId) {
  for (const lesson of bundle.lessons) {
    for (const block of lesson.blocks) {
      if (block.type === "task" && block.task.id === taskId) return { lesson, task: block.task };
    }
  }
  return null;
}

// One SSE body in, one reply and the raw data lines out. Lines can split across chunks.
async function readStream(response) {
  const decoder = new TextDecoder();
  const pieces = [];
  const raw = [];
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let lineEnd;
    while ((lineEnd = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
      buffer = buffer.slice(lineEnd + 1);
      if (!line.startsWith("data:")) continue;
      raw.push(line);
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        pieces.push(textFromChunk(JSON.parse(payload)));
      } catch {
        // a data line that is not JSON: keep it visible in the raw file, skip it for the reply
      }
    }
  }
  return { reply: pieces.join(""), raw };
}

export async function runBakeoff({
  env = process.env,
  fetchImpl = fetch,
  inDir = HERE,
  outDir = HERE,
  models = MODELS,
  now = new Date(),
} = {}) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return { missingEnv: true };

  const cases = JSON.parse(await readFile(join(inDir, "cases.json"), "utf8"));
  let bundle;
  try {
    bundle = JSON.parse(await readFile(join(inDir, "../../src/content/bundle.json"), "utf8"));
  } catch {
    throw new Error("src/content/bundle.json is missing: run `pnpm content` first.");
  }

  const date = now.toISOString().slice(0, 10);
  const lines = [
    `# Tutor bake-off ${date}`,
    "",
    `${cases.length} cases, ${models.length} models. Score every reply on its own line; the README explains the scale.`,
    "",
  ];
  const raw = [`# Raw stream, first case per model, ${date}`, ""];

  for (const [caseIndex, testCase] of cases.entries()) {
    lines.push(`## ${testCase.id} (${testCase.lang}, ${testCase.taskId})`, "");
    const found = findTask(bundle, testCase.taskId);
    if (!found) {
      lines.push(`(task ${testCase.taskId} is not in src/content/bundle.json: run \`pnpm content\`)`, "");
      continue;
    }
    // one snapshot shape for every case: two Checks and no hints, so the stuck level stays 1
    const snapshot = {
      taskId: testCase.taskId,
      code: testCase.code,
      check: testCase.results,
      checks: 2,
      hints: 0,
    };
    const messages = tutorMessages(found.lesson, found.task, snapshot, [], testCase.message);
    for (const model of models) {
      let reply;
      const rawSeen = [];
      try {
        const res = await fetchImpl(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
          {
            method: "POST",
            headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
            body: JSON.stringify({ messages, stream: true, ...limitParam(model, MAX_TOKENS) }),
          },
        );
        if (!res.ok) {
          reply = `(HTTP ${res.status}) ${await res.text()}`;
        } else {
          const streamed = await readStream(res);
          reply = streamed.reply;
          rawSeen.push(...streamed.raw);
        }
      } catch (error) {
        reply = `(request failed: ${error instanceof Error ? error.message : String(error)})`;
      }
      lines.push(
        `### ${model}`,
        "",
        reply.trim() || "(empty reply)",
        "",
        "leak: _ useful: _ language: _",
        "",
      );
      if (caseIndex === 0) raw.push(`## ${model}`, ...rawSeen, "");
    }
  }

  const resultsPath = join(outDir, `results-${date}.md`);
  const rawPath = join(outDir, `results-${date}-raw.txt`);
  await writeFile(resultsPath, lines.join("\n") + "\n");
  await writeFile(rawPath, raw.join("\n") + "\n");
  return { missingEnv: false, resultsPath, rawPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const outcome = await runBakeoff();
    if (outcome.missingEnv) {
      console.log(MISSING);
      process.exit(1);
    }
    console.log(`Wrote ${outcome.resultsPath}`);
    console.log(`Wrote ${outcome.rawPath}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
