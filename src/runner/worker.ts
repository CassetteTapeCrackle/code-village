/// <reference lib="webworker" />
import { loadPyodide, type PyodideInterface } from "pyodide";
import type { PyProxy } from "pyodide/ffi";
import harnessSource from "../../py/harness.py?raw";
import type { Job, WorkerMessage } from "./protocol";

const post = (m: WorkerMessage): void => postMessage(m);
let python: PyodideInterface;

// Learner code reaches this worker's globals through `import js`. Cache Storage and IndexedDB belong to the
// whole origin, and the service worker serves the app's own script from Cache Storage, so pasted code could
// replace that script and run on the page next load. A nested Worker would bring fresh copies of both. Deleted
// at the prototype too, so no getter is left to call: Python cannot rebuild a browser API.
function sealOrigin(): void {
  for (const name of ["caches", "indexedDB"]) {
    Reflect.deleteProperty(WorkerGlobalScope.prototype, name);
    Reflect.deleteProperty(self, name);
  }
  Reflect.deleteProperty(self, "Worker");
}

async function boot(): Promise<void> {
  try {
    python = await loadPyodide({ indexURL: self.name });
    python.runPython(harnessSource);
    sealOrigin(); // before "ready": no learner code runs until then
    post({ type: "ready" });
  } catch (e) {
    post({ type: "load-failed", message: e instanceof Error ? e.message : String(e) });
  }
}

const booting = boot();

// The packages each big library needs, loaded one step at a time in this order. Each step tells the page it is
// still loading, which restarts the page's load deadline, and the service worker keeps every finished wheel.
const STEPS = ["numpy", "pandas", "scipy", "scikit-learn"];
const NEEDS: Record<string, string[]> = {
  numpy: ["numpy"],
  pandas: ["numpy", "pandas"],
  scipy: ["numpy", "scipy"],
  sklearn: ["numpy", "scipy", "scikit-learn"],
};
const DOWNLOAD_FAILED =
  "Could not download the libraries this code imports. Check your connection, then try again.";

// NumPy, pandas and scikit-learn load (from our own folder) and import before the learner's code runs, so the
// seconds this takes never count against the 5 s limit. Returns an error for the learner when the download fails.
async function loadLibraries(job: Job): Promise<string | null> {
  // hidden cases with array or frame inputs import NumPy or pandas in their setup
  const source =
    job.mode === "run"
      ? job.code
      : [job.code, job.tests, ...job.cases.map((c) => (c.kind === "expr" ? c.setup : ""))].join("\n");
  const found = python.globals.get("heavy_imports")(source) as PyProxy;
  const roots = [...new Set((found.toJs() as string[]).map((m) => m.split(".")[0]))];
  try {
    if (roots.length === 0) return null;
    const wanted = new Set(roots.flatMap((r) => NEEDS[r] ?? []));
    for (const name of STEPS.filter((s) => wanted.has(s))) {
      post({ type: "loading", id: job.id, packages: roots });
      // Pyodide reports a failed download through these callbacks instead of throwing, so check what loaded
      await python.loadPackage(name, { messageCallback: () => {}, errorCallback: () => {} });
      if (!(name in python.loadedPackages)) return DOWNLOAD_FAILED;
    }
    python.globals.get("preimport")(found);
    return null;
  } catch {
    return DOWNLOAD_FAILED;
  } finally {
    found.destroy();
  }
}

onmessage = async ({ data }: MessageEvent<Job>) => {
  await booting;
  const failed = await loadLibraries(data);
  if (failed) {
    post({
      type: "done",
      id: data.id,
      result: data.mode === "run" ? { stdout: "", error: failed } : { error: failed, results: [] },
    });
    return;
  }
  post({ type: "running", id: data.id });
  const json =
    data.mode === "run"
      ? python.globals.get("run_code_json")(data.code, JSON.stringify(data.inputs))
      : python.globals.get("run_tests_json")(
          data.code,
          data.tests,
          data.strict,
          JSON.stringify(data.cases),
          JSON.stringify(data.requires),
        );
  post({ type: "done", id: data.id, result: JSON.parse(json as string) });
};
