import { describe, expect, test } from "vitest";
import { emptyProgress } from "../learning/types";
import {
  freshTour,
  nextStep,
  replayTour,
  shouldStart,
  TOUR_STEPS,
  unseenTip,
  type TourState,
  type TourStepId,
} from "./tour";

const at = (step: TourStepId, patch: Partial<TourState> = {}): TourState => ({
  ...freshTour(),
  step,
  ...patch,
});

describe("shouldStart", () => {
  test("starts only for a device with no tour state and no passed task", () => {
    expect(shouldStart(null, emptyProgress())).toBe(true);
    expect(shouldStart(freshTour(), emptyProgress())).toBe(false);
    const passed = emptyProgress();
    passed.tasks["vars-1"] = { passedAt: "2026-10-01", hintsUsed: 0, checks: 1, xpEarned: 10 };
    expect(shouldStart(null, passed)).toBe(false);
  });
});

describe("nextStep", () => {
  test("a step advances only on its own event", () => {
    expect(nextStep(at("walk-anywhere"), "check").step).toBe("walk-anywhere");
    expect(nextStep(at("walk-anywhere"), "walk-anywhere").step).toBe("walk-building");
    expect(nextStep(at("run"), "walk-building").step).toBe("run");
    expect(nextStep(at("run"), "run").step).toBe("check");
    expect(nextStep(at("check"), "check").step).toBe("ask-tutor");
  });

  test("Next only moves the steps that offer it", () => {
    expect(nextStep(at("welcome"), "next").step).toBe("walk-anywhere");
    expect(nextStep(at("ask-tutor"), "next").step).toBe("grows");
    expect(nextStep(at("run"), "next").step).toBe("run");
  });

  test("joining the board records it and leads to the recovery code", () => {
    const joined = nextStep(at("join-board"), "join-board");
    expect(joined.step).toBe("recovery");
    expect(joined.joined).toBe(true);
  });

  test("Later skips the recovery step when the board was not joined", () => {
    expect(nextStep(at("join-board"), "next").step).toBe("connect");
  });

  test("recovery moves on only when it was ticked", () => {
    const state = at("recovery", { joined: true });
    expect(nextStep(state, "next").step).toBe("recovery");
    const saved = nextStep(state, "recovery");
    expect(saved.step).toBe("connect");
    expect(saved.recoverySaved).toBe(true);
  });

  test("skip ends the tour from any step", () => {
    for (const step of TOUR_STEPS) {
      const ended = nextStep(at(step.id), "skip");
      expect(ended.done).toBe(true);
      expect(ended.skipped).toBe(true);
    }
  });

  test("an ended tour ignores every event", () => {
    const ended = at("goodbye", { done: true, skipped: true });
    expect(nextStep(ended, "walk-anywhere")).toBe(ended);
    expect(nextStep(ended, "skip")).toBe(ended);
  });

  test("unknown events are ignored", () => {
    const state = at("welcome");
    expect(nextStep(state, "nonsense")).toBe(state);
  });

  test("goodbye ends the tour", () => {
    const end = nextStep(at("goodbye"), "next");
    expect(end.done).toBe(true);
    expect(end.skipped).toBe(false);
  });
});

describe("replayTour", () => {
  test("restarts at welcome without touching progress or seen tips", () => {
    const done = at("goodbye", { done: true, skipped: true, seenTips: ["garden"] });
    const again = replayTour(done);
    expect(again.step).toBe("welcome");
    expect(again.done).toBe(false);
    expect(again.skipped).toBe(false);
    expect(again.seenTips).toEqual(["garden"]);
  });
});

describe("unseenTip", () => {
  test("tips wait for the tour to be over and show once", () => {
    expect(unseenTip(freshTour(), "#/garden")).toBeNull();
    const after = at("goodbye", { done: true });
    expect(unseenTip(after, "#/garden")).toBe("garden");
    expect(unseenTip({ ...after, seenTips: ["garden"] }, "#/garden")).toBeNull();
  });
});
