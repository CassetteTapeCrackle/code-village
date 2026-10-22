export type RunResult = { stdout: string; error: string | null };
export type TestResult = { name: string; passed: boolean; message: string };
export type CheckResult = { error: string | null; results: TestResult[] };
export type Job =
  | { id: number; mode: "run"; code: string; inputs: string[] }
  | { id: number; mode: "check"; code: string; tests: string; strict: boolean };
export type WorkerMessage =
  | { type: "ready" }
  | { type: "load-failed"; message: string }
  | { type: "loading"; id: number; packages: string[] } // a job imports big libraries: downloading and importing them, untimed
  | { type: "running"; id: number } // the learner's code starts now, and so does the time limit
  | { type: "done"; id: number; result: RunResult | CheckResult };
