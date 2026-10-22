import { describe, expect, test } from "vitest";
import { emptyProgress } from "../learning/types";
import {
  cardSpot,
  freshTour,
  nextStep,
  replayTour,
  shouldStart,
  targetBox,
  TOUR_STEPS,
  unseenTip,
  waitingAt,
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

describe("waitingAt", () => {
  test("the way back says where Ms. Juniper waits", () => {
    expect(waitingAt("#/")).toBe("on the map");
    expect(waitingAt("#/lesson/hello-village")).toBe("in the lesson");
    expect(waitingAt("#/school")).toBe("at the school");
    expect(waitingAt("#/house")).toBe("at the house");
  });
});

describe("targetBox", () => {
  test("keeps a visible target's viewport rect", () => {
    expect(targetBox({ left: 12, top: 34, width: 100, height: 40 })).toEqual({
      left: 12,
      top: 34,
      width: 100,
      height: 40,
    });
  });

  test("hides a target that has no size yet", () => {
    expect(targetBox({ left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});

describe("cardSpot", () => {
  const target = (left: number, top: number) => ({ left, top, width: 100, height: 40 });
  const viewport = { width: 1280, height: 800 };

  test("on the map the card takes the half away from the target", () => {
    expect(cardSpot("", target(100, 100), viewport)).toEqual({ right: true, top: false });
    expect(cardSpot("", target(1000, 600), viewport)).toEqual({ right: false, top: true });
  });

  test("on a place the wide card keeps to the bottom left, clear of the title", () => {
    expect(cardSpot("lesson/hello-village", target(1000, 600), viewport)).toEqual({
      right: false,
      top: false,
    });
    expect(cardSpot("school", target(100, 100), viewport)).toEqual({ right: false, top: false });
  });

  test("a phone keeps the target-aware card", () => {
    const phone = { width: 390, height: 844 };
    expect(cardSpot("lesson/hello-village", target(300, 700), phone)).toEqual({
      right: false,
      top: true,
    });
    expect(cardSpot("lesson/hello-village", target(20, 100), phone)).toEqual({
      right: true,
      top: false,
    });
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
