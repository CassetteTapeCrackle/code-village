// Repeat in Pyodide, the learner's runtime, every verdict CPython reached on the content (tools/vet/jobs.py writes
// them with `pnpm content --jobs-out`), through the same py/harness.py the site runs. Exits 1 listing every job
// whose output or verdict differs, and every library whose Pyodide version differs from the pnpm content pins.
// Run it with node --stack-size=4000 (pnpm vet:pyodide): with Node's default stack, Python code that recurses
// until RecursionError overflows the JavaScript stack first and Pyodide aborts, which a browser's larger stack avoids.
// shortcut: a job that loops forever only in Pyodide hangs this script (Pyodide on the main thread cannot be
// interrupted); the CI step's time limit stops it. Run jobs in a worker with a deadline if that ever happens.
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { loadPyodide } from "pyodide";

const file = process.argv[2] ?? ".vet-cache/pyodide-jobs.json";
const { pins, jobs } = JSON.parse(readFileSync(file, "utf8"));
const lock = JSON.parse(readFileSync("node_modules/pyodide/pyodide-lock.json", "utf8"));
const problems = [];

for (const [name, wanted] of Object.entries(pins)) {
  const shipped = lock.packages[name]?.version;
  if (shipped !== wanted)
    problems.push(`libraries: Pyodide ships ${name} ${shipped}, pnpm content pins ${wanted}`);
}

// the wheels the app serves, fetched once into the same folder scripts/copy-pyodide.mjs uses
const python = await loadPyodide({ packageCacheDir: "node_modules/.cache/pyodide-wheels" });
python.runPython(readFileSync("py/harness.py", "utf8"));
const runJob = python.runPython("lambda job: json.dumps(_run_job(json.loads(job)))");
const PACKAGES = { numpy: "numpy", pandas: "pandas", scipy: "scipy", sklearn: "scikit-learn" };

// what the browser worker does before a job: load and import the libraries its code names; the reason when it cannot
async function loadLibraries(source) {
  const found = python.globals.get("heavy_imports")(source);
  try {
    const roots = [...new Set(found.toJs().map((m) => m.split(".")[0]))];
    const packages = roots.map((r) => PACKAGES[r]).filter(Boolean);
    if (packages.length)
      await python.loadPackage(packages, { messageCallback: () => {}, errorCallback: () => {} });
    const missing = packages.filter((p) => !(p in python.loadedPackages));
    if (missing.length) return `Pyodide could not load ${missing.join(", ")} (no network to the CDN?)`;
    python.globals.get("preimport")(found);
    return null;
  } finally {
    found.destroy();
  }
}

function harnessJob(job) {
  if (job.kind === "check")
    return { mode: "check", code: job.code, tests: job.tests, strict: job.strict, cases: job.cases };
  if (job.kind === "expect") return { mode: "expect", code: job.code, cases: job.cases };
  return { mode: "run", code: job.code, inputs: [] };
}

function verdict(job, out) {
  if (job.kind === "check") {
    const passed = !out.error && out.results.length > 0 && out.results.every((r) => r.passed);
    return passed ? "pass" : "fail";
  }
  if (job.kind === "expect") return { values: out.values };
  if (job.kind === "claim") return out.error ? "fail" : "pass";
  return { output: out.stdout, error: out.error };
}

for (const job of jobs) {
  const sources = [job.code, job.tests ?? "", ...(job.cases ?? []).map((c) => c.setup ?? "")];
  const failed = await loadLibraries(sources.join("\n"));
  if (failed) {
    problems.push(`${job.id}: ${failed}`);
    continue;
  }
  const got = verdict(job, JSON.parse(runJob(JSON.stringify(harnessJob(job)))));
  if (!isDeepStrictEqual(got, job.expect)) {
    problems.push(`${job.id}: CPython gives ${JSON.stringify(job.expect)}, Pyodide ${JSON.stringify(got)}`);
  }
}

for (const problem of problems) console.log(problem);
console.log(`vet-pyodide: ${jobs.length} job(s), ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
