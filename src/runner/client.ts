import type { CheckResult, Job, RunResult, WorkerMessage } from "./protocol";

export type Outcome<T> =
  { kind: "ok"; result: T } | { kind: "timeout" } | { kind: "unavailable"; message: string };
export type WorkerLike = {
  postMessage(job: Job): void;
  terminate(): void;
  onmessage: ((e: { data: WorkerMessage }) => void) | null;
};
export type Runner = {
  run(code: string, inputs?: string[]): Promise<Outcome<RunResult>>;
  check(code: string, tests: string, strict?: boolean): Promise<Outcome<CheckResult>>;
  status(): "loading" | "ready" | "failed";
  retry(): void;
};

export const TIMEOUT_MESSAGE = "Still running after 5 s, so it was stopped. Check your loop's condition.";
export const LIBRARY_TIMEOUT_MESSAGE =
  "the libraries did not finish loading in 60 s; check your connection, then try again";
// Downloading and importing NumPy, pandas or scikit-learn is not the learner's code, so it gets its own, long deadline.
const LOAD_DEADLINE_MS = 60_000;

type Pending = { job: Job; resolve: (o: Outcome<RunResult | CheckResult>) => void };

function realWorker(): WorkerLike {
  // the worker cannot see the page's base URL, so Pyodide's folder travels as the worker's name
  const pyodideUrl = new URL("pyodide/", document.baseURI).href;
  return new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
    name: pyodideUrl,
  }) as unknown as WorkerLike;
}

type RunnerOptions = {
  timeoutMs?: number;
  makeWorker?: () => WorkerLike;
  onLoading?: (packages: string[] | null) => void;
};

export function createRunner({
  timeoutMs = 5000,
  makeWorker = realWorker,
  onLoading = () => {},
}: RunnerOptions = {}): Runner {
  let worker: WorkerLike;
  let state: "loading" | "ready" | "failed" = "loading";
  let failure = "";
  let nextId = 1;
  let active: Pending | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queue: Pending[] = [];

  function start(): void {
    state = "loading";
    worker = makeWorker();
    worker.onmessage = ({ data }) => {
      if (data.type === "ready") {
        state = "ready";
        pump();
      } else if (data.type === "load-failed") {
        state = "failed";
        failure = data.message;
        for (const p of queue.splice(0)) p.resolve({ kind: "unavailable", message: failure });
      } else if (!active || data.id !== active.job.id) {
        return;
      } else if (data.type === "loading") {
        // each library step restarts the deadline, so a slow connection gets 60 s per library, not for all of them
        onLoading(data.packages);
        clearTimeout(timer);
        timer = setTimeout(
          () => restartWith({ kind: "unavailable", message: LIBRARY_TIMEOUT_MESSAGE }),
          LOAD_DEADLINE_MS,
        );
      } else if (data.type === "running") {
        onLoading(null);
        clearTimeout(timer);
        timer = setTimeout(() => restartWith({ kind: "timeout" }), timeoutMs);
      } else {
        clearTimeout(timer);
        onLoading(null);
        const done = active;
        active = null;
        done.resolve({ kind: "ok", result: data.result });
        pump();
      }
    };
  }

  // The only way to stop Python mid-run: drop the worker and start a fresh one.
  function restartWith(outcome: Outcome<never>): void {
    const stuck = active!;
    active = null;
    onLoading(null);
    worker.terminate();
    start();
    stuck.resolve(outcome);
  }

  function pump(): void {
    if (state !== "ready" || active || queue.length === 0) return;
    active = queue.shift()!;
    // until the worker says the learner's code is running, only the long loading deadline applies
    timer = setTimeout(
      () => restartWith({ kind: "unavailable", message: LIBRARY_TIMEOUT_MESSAGE }),
      LOAD_DEADLINE_MS,
    );
    worker.postMessage(active.job);
  }

  function submit<T extends RunResult | CheckResult>(job: Job): Promise<Outcome<T>> {
    if (state === "failed") return Promise.resolve({ kind: "unavailable", message: failure });
    return new Promise((resolve) => {
      queue.push({ job, resolve: resolve as Pending["resolve"] });
      pump();
    });
  }

  start();
  return {
    run: (code, inputs = []) => submit<RunResult>({ id: nextId++, mode: "run", code, inputs }),
    check: (code, tests, strict = false) =>
      submit<CheckResult>({ id: nextId++, mode: "check", code, tests, strict }),
    status: () => state,
    retry: () => {
      if (state !== "failed") return;
      worker.terminate();
      start();
    },
  };
}

export function passedAll(o: Outcome<CheckResult>): boolean {
  return (
    o.kind === "ok" &&
    !o.result.error &&
    o.result.results.length > 0 &&
    o.result.results.every((t) => t.passed)
  );
}
