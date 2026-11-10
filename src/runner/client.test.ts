import { describe, expect, test, vi } from "vitest";
import { LIBRARY_TIMEOUT_MESSAGE, createRunner, passedAll, type WorkerLike } from "./client";
import type { HiddenCase, Job, TestResult, WorkerMessage } from "./protocol";

type Fake = WorkerLike & { jobs: Job[]; send(m: WorkerMessage): void; terminated: boolean };

// By default the fake starts each job's code at once, like a job without big imports.
function fakeWorker(startsAtOnce = true): Fake {
  const w: Fake = {
    jobs: [],
    terminated: false,
    onmessage: null,
    postMessage(job) {
      // a real worker gets a structured clone, which throws on anything postMessage cannot send
      w.jobs.push(structuredClone(job));
      if (startsAtOnce) queueMicrotask(() => w.send({ type: "running", id: job.id }));
    },
    terminate() {
      w.terminated = true;
    },
    send(m) {
      w.onmessage?.({ data: m });
    },
  };
  return w;
}

describe("runner client", () => {
  test("waits for ready, then runs and returns the result", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    const pending = runner.run("print(1)");
    expect(w.jobs).toHaveLength(0);
    w.send({ type: "ready" });
    await Promise.resolve();
    expect(w.jobs[0]).toMatchObject({ mode: "run", code: "print(1)", inputs: [] });
    w.send({ type: "done", id: w.jobs[0].id, result: { stdout: "1\n", error: null } });
    expect(await pending).toEqual({ kind: "ok", result: { stdout: "1\n", error: null } });
  });

  test("a check carries the task's strict flag", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    w.send({ type: "ready" });
    const pending = runner.check("a", { tests: "t", strict: true, cases: [], requires: [] });
    await Promise.resolve();
    expect(w.jobs[0]).toMatchObject({ mode: "check", strict: true });
    w.send({ type: "done", id: w.jobs[0].id, result: { error: null, results: [] } });
    await pending;
  });

  test("a check sends plain cases even when they come from Svelte state", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    w.send({ type: "ready" });
    const plain: HiddenCase = {
      kind: "expr",
      show: "last_item([1, 2])",
      setup: "",
      expr: "last_item([1, 2])",
      expect: "2",
      raises: null,
      compare: "exact",
    };
    // $state wraps arrays and objects in proxies, which postMessage refuses (the daily review hung on this)
    const reactive = new Proxy([new Proxy(plain, {})], {});
    const pending = runner.check("a", { tests: "t", cases: reactive, requires: [] });
    await Promise.resolve();
    expect(w.jobs[0]).toMatchObject({ cases: [plain] });
    w.send({ type: "done", id: w.jobs[0].id, result: { error: null, results: [] } });
    await pending;
  });

  test("a check sends the suite's hidden cases, and a suite without strict is not strict", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    w.send({ type: "ready" });
    const cases: HiddenCase[] = [
      {
        kind: "expr",
        show: "larger(3, 7)",
        setup: "",
        expr: "larger(3, 7)",
        expect: "7",
        raises: null,
        compare: "exact",
      },
    ];
    const pending = runner.check("a", { tests: "t", cases, requires: [] });
    await Promise.resolve();
    expect(w.jobs[0]).toEqual({
      id: w.jobs[0].id,
      mode: "check",
      code: "a",
      tests: "t",
      strict: false,
      cases,
      requires: [],
    });
    w.send({ type: "done", id: w.jobs[0].id, result: { error: null, results: [] } });
    await pending;
  });

  test("a check sends the constructs the task requires as plain data", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    w.send({ type: "ready" });
    const need = {
      id: "property-decorator",
      detect: ["decorator:property"],
      say: "put @property above the method",
    };
    const pending = runner.check("a", {
      tests: "t",
      cases: [],
      requires: new Proxy([new Proxy(need, {})], {}),
    });
    await Promise.resolve();
    expect(w.jobs[0]).toMatchObject({ requires: [need] });
    w.send({ type: "done", id: w.jobs[0].id, result: { error: null, results: [] } });
    await pending;
  });

  test("jobs run one at a time, in order", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    w.send({ type: "ready" });
    const first = runner.check("a", { tests: "t", cases: [], requires: [] });
    const second = runner.run("b");
    await Promise.resolve();
    expect(w.jobs).toHaveLength(1);
    w.send({ type: "done", id: w.jobs[0].id, result: { error: null, results: [] } });
    await first;
    await Promise.resolve();
    expect(w.jobs).toHaveLength(2);
    w.send({ type: "done", id: w.jobs[1].id, result: { stdout: "", error: null } });
    expect((await second).kind).toBe("ok");
  });

  test("a job over the limit is stopped, the worker restarts, the next job still runs", async () => {
    vi.useFakeTimers();
    const workers: Fake[] = [];
    const runner = createRunner({
      timeoutMs: 5000,
      makeWorker: () => {
        const w = fakeWorker();
        workers.push(w);
        return w;
      },
    });
    workers[0].send({ type: "ready" });
    const stuck = runner.run("while True: pass");
    const next = runner.run("print(2)");
    await vi.advanceTimersByTimeAsync(5001);
    expect(await stuck).toEqual({ kind: "timeout" });
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
    workers[1].send({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);
    workers[1].send({ type: "done", id: workers[1].jobs[0].id, result: { stdout: "2\n", error: null } });
    expect(await next).toEqual({ kind: "ok", result: { stdout: "2\n", error: null } });
    vi.useRealTimers();
  });

  test("loading big libraries is not timed: the 5 s limit starts when the code runs", async () => {
    vi.useFakeTimers();
    const w = fakeWorker(false);
    const loading: (string[] | null)[] = [];
    const runner = createRunner({ timeoutMs: 5000, makeWorker: () => w, onLoading: (p) => loading.push(p) });
    w.send({ type: "ready" });
    const pending = runner.run("import pandas");
    await vi.advanceTimersByTimeAsync(0);
    w.send({ type: "loading", id: w.jobs[0].id, packages: ["pandas"] });
    await vi.advanceTimersByTimeAsync(20_000); // a slow download: still waiting, not stopped
    expect(w.terminated).toBe(false);
    w.send({ type: "running", id: w.jobs[0].id });
    await vi.advanceTimersByTimeAsync(4000);
    w.send({ type: "done", id: w.jobs[0].id, result: { stdout: "", error: null } });
    expect((await pending).kind).toBe("ok");
    expect(loading[0]).toEqual(["pandas"]);
    expect(loading.at(-1)).toBeNull();
    vi.useRealTimers();
  });

  test("a load that stalls ends as unavailable after 60 s, and Python restarts", async () => {
    vi.useFakeTimers();
    const workers: Fake[] = [];
    const runner = createRunner({
      makeWorker: () => {
        const w = fakeWorker(false);
        workers.push(w);
        return w;
      },
    });
    workers[0].send({ type: "ready" });
    const pending = runner.run("import sklearn");
    await vi.advanceTimersByTimeAsync(0);
    workers[0].send({ type: "loading", id: workers[0].jobs[0].id, packages: ["sklearn"] });
    await vi.advanceTimersByTimeAsync(60_001);
    expect(await pending).toEqual({ kind: "unavailable", message: LIBRARY_TIMEOUT_MESSAGE });
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
    vi.useRealTimers();
  });

  test("each library step restarts the loading deadline, and the label clears when the job ends", async () => {
    vi.useFakeTimers();
    const w = fakeWorker(false);
    const loading: (string[] | null)[] = [];
    const runner = createRunner({ makeWorker: () => w, onLoading: (p) => loading.push(p) });
    w.send({ type: "ready" });
    const pending = runner.run("import sklearn");
    await vi.advanceTimersByTimeAsync(0);
    for (let step = 0; step < 3; step++) {
      w.send({ type: "loading", id: w.jobs[0].id, packages: ["sklearn"] });
      await vi.advanceTimersByTimeAsync(50_000); // three slow steps: 150 s in all, never 60 s on one
    }
    expect(w.terminated).toBe(false);
    w.send({ type: "done", id: w.jobs[0].id, result: { stdout: "", error: "Could not download" } });
    expect((await pending).kind).toBe("ok");
    expect(loading.at(-1)).toBeNull();
    vi.useRealTimers();
  });

  test("a failed load answers every job with unavailable", async () => {
    const w = fakeWorker();
    const runner = createRunner({ makeWorker: () => w });
    const pending = runner.run("print(1)");
    w.send({ type: "load-failed", message: "offline" });
    expect(await pending).toEqual({ kind: "unavailable", message: "offline" });
    expect(runner.status()).toBe("failed");
  });
  test("retry after a failed load starts a fresh worker that runs jobs", async () => {
    const workers: Fake[] = [];
    const runner = createRunner({
      makeWorker: () => {
        const w = fakeWorker();
        workers.push(w);
        return w;
      },
    });
    workers[0].send({ type: "load-failed", message: "offline" });
    runner.retry();
    expect(runner.status()).toBe("loading");
    expect(workers).toHaveLength(2);
    const pending = runner.run("print(3)");
    workers[1].send({ type: "ready" });
    await Promise.resolve();
    workers[1].send({ type: "done", id: workers[1].jobs[0].id, result: { stdout: "3\n", error: null } });
    expect(await pending).toEqual({ kind: "ok", result: { stdout: "3\n", error: null } });
  });

  test("retry does nothing while Python is loading or ready", () => {
    const workers: Fake[] = [];
    const runner = createRunner({
      makeWorker: () => {
        const w = fakeWorker();
        workers.push(w);
        return w;
      },
    });
    runner.retry();
    workers[0].send({ type: "ready" });
    runner.retry();
    expect(workers).toHaveLength(1);
  });
});

test("passedAll needs an ok result with no error and every test passed", () => {
  const ok = (results: TestResult[], error: string | null = null) => ({
    kind: "ok" as const,
    result: { error, results },
  });
  expect(passedAll(ok([{ name: "a", passed: true, message: "", hidden: false }]))).toBe(true);
  expect(passedAll(ok([]))).toBe(false);
  expect(passedAll(ok([{ name: "a", passed: false, message: "x", hidden: false }]))).toBe(false);
  expect(passedAll(ok([], "SyntaxError on line 1: invalid syntax"))).toBe(false);
  expect(passedAll({ kind: "timeout" })).toBe(false);
});
