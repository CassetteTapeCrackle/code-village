// Stubbed-fetch test for run.mjs: proves the script works end to end without spending
// real Workers AI quota. Run with: node --test tools/tutor_eval/run.test.mjs
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { test } from "node:test";
import { findTask, runBakeoff } from "./run.mjs";
import { textFromChunk } from "../../worker/src/aiStream.ts";

const CASES = JSON.parse(await readFile(new URL("./cases.json", import.meta.url), "utf8"));
const firstCase = CASES[0];

test("textFromChunk reads both chunk shapes and hides reasoning", () => {
  assert.equal(textFromChunk({ response: "old style" }), "old style");
  assert.equal(textFromChunk({ choices: [{ delta: { content: "new style" } }] }), "new style");
  assert.equal(textFromChunk({ choices: [{ delta: { reasoning_content: "thinking" } }] }), "");
  assert.equal(textFromChunk({ choices: [{ delta: { reasoning: "thinking" } }] }), "");
  assert.equal(textFromChunk("junk"), "");
  assert.equal(textFromChunk(null), "");
});

test("every case points at a task that exists in the bundle", async () => {
  const bundle = JSON.parse(
    await readFile(new URL("../../src/content/bundle.json", import.meta.url), "utf8"),
  );
  for (const testCase of CASES) {
    assert.ok(findTask(bundle, testCase.taskId), `${testCase.id}: unknown task ${testCase.taskId}`);
  }
});

// One SSE body split into three chunks so line-splitting is exercised, echoing the learner
// message so each case's reply is identifiable in the outputs.
function stubFetch(calls) {
  return async (url, init) => {
    calls.push({ url, init });
    const body = JSON.parse(init.body);
    const fenced = body.messages.at(-1).content;
    const echoed = fenced.split("\n")[1].slice(0, 20);
    const sse =
      `data: {"response":${JSON.stringify("echo " + echoed)}}\n\n` +
      `data: {"choices":[{"delta":{"reasoning_content":"hidden thinking"}}]}\n\n` +
      `data: {"choices":[{"delta":{"content":"!"}}]}\n\n` +
      "data: [DONE]\n\n";
    const bytes = new TextEncoder().encode(sse);
    const third = Math.ceil(bytes.length / 3);
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 3; i++) controller.enqueue(bytes.slice(i * third, (i + 1) * third));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
}

test("a stubbed run writes a section per case and per model, scores, and raw chunks only for the first case", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "tutor-eval-"));
  const models = ["@cf/google/gemma-4-26b-a4b-it", "@cf/openai/gpt-oss-20b"];
  const calls = [];
  const outcome = await runBakeoff({
    env: { CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_API_TOKEN: "tok" },
    fetchImpl: stubFetch(calls),
    outDir,
    models,
    now: new Date("2026-10-15T00:00:00Z"),
  });
  assert.equal(outcome.missingEnv, false);
  assert.equal(calls.length, CASES.length * models.length);

  const gemma = calls.find((c) => c.url.includes("gemma"));
  const oss = calls.find((c) => c.url.includes("gpt-oss"));
  assert.ok(gemma.url.startsWith("https://api.cloudflare.com/client/v4/accounts/acc/ai/run/"));
  assert.equal(gemma.init.headers.authorization, "Bearer tok");
  assert.equal(JSON.parse(gemma.init.body).max_completion_tokens, 300);
  assert.equal(JSON.parse(oss.init.body).max_tokens, 300);
  const sent = JSON.parse(gemma.init.body);
  assert.equal(sent.stream, true);
  assert.equal(sent.messages[0].role, "system");
  assert.match(sent.messages[0].content, /village teacher/);
  assert.ok(
    !JSON.stringify(sent.messages).includes("expect_equal"),
    "the task tests source must never reach the model",
  );

  const results = await readFile(outcome.resultsPath, "utf8");
  for (const model of models) assert.ok(results.includes(`### ${model}`), model);
  for (const testCase of CASES) assert.ok(results.includes(`## ${testCase.id}`), testCase.id);
  assert.equal(results.match(/leak: _ useful: _ language: _/g).length, CASES.length * models.length);
  assert.ok(
    results.includes(`echo ${firstCase.message.slice(0, 20)}!`),
    "both chunks concatenate into the reply",
  );
  assert.ok(!results.includes("hidden thinking"), "reasoning stays out of the reply");

  const rawText = await readFile(outcome.rawPath, "utf8");
  assert.ok(rawText.includes("## @cf/google/gemma-4-26b-a4b-it"));
  assert.ok(rawText.includes("## @cf/openai/gpt-oss-20b"));
  assert.ok(rawText.includes(`echo ${firstCase.message.slice(0, 20)}`));
  assert.ok(!rawText.includes(`echo ${CASES[1].message.slice(0, 20)}`), "only the first case is raw-dumped");
});

test("without the environment variables the CLI prints the message and exits 1", async () => {
  const run = promisify(execFile);
  await assert.rejects(
    run(process.execPath, [fileURLToPath(new URL("./run.mjs", import.meta.url))], { env: {} }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to run the bake-off\./);
      return true;
    },
  );
});
