export type RunResult = { stdout: string; error: string | null };
// hidden: the one result that stands for the hidden cases (the first failing case, or a summary when all pass)
export type TestResult = { name: string; passed: boolean; message: string; hidden: boolean };
export type CheckResult = { error: string | null; results: TestResult[] };
export type Compare = "exact" | "unordered" | "float" | "text" | "array" | "frame" | "valid";
// An input generated at build time and what the model solution gave for it (py/harness.py reads it).
// `expect` is Python source; with compare "valid" it is the input, judged by the tests.py function `valid`.
export type HiddenCase =
  | {
      kind: "expr";
      show: string;
      setup: string;
      expr: string;
      expect: string;
      raises: string | null;
      compare: Compare;
      valid?: string;
    }
  | { kind: "program"; show: string; stdin: string[]; expect: string; compare: Compare; valid?: string };
// A way of writing the code that a task asks for by name (spec 11b): the feature id, the detectors that find it
// (py/harness.py detect_features) and what Check tells the learner to do when the code lacks it.
export type RequiredConstruct = { id: string; detect: string[]; say: string };
// What Check runs code against. A task, a variant or a boss stage satisfies it as it comes from the bundle.
export type CheckSuite = {
  tests: string;
  strict?: boolean;
  cases: HiddenCase[];
  requires: RequiredConstruct[];
};
export type Job =
  | { id: number; mode: "run"; code: string; inputs: string[] }
  | {
      id: number;
      mode: "check";
      code: string;
      tests: string;
      strict: boolean;
      cases: HiddenCase[];
      requires: RequiredConstruct[];
    };
export type WorkerMessage =
  | { type: "ready" }
  | { type: "load-failed"; message: string }
  | { type: "loading"; id: number; packages: string[] } // a job imports big libraries: downloading and importing them, untimed
  | { type: "running"; id: number } // the learner's code starts now, and so does the time limit
  | { type: "done"; id: number; result: RunResult | CheckResult };
