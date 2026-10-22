import { describe, expect, it } from "vitest";
import { LINES, freshMemory, pickLine, type LineContext } from "./lines";

const quiet: LineContext = { passed: [], nudge: null, activity: null };
const first = (): number => 0;

describe("villager lines", () => {
  it("gives every villager at least ten lines, with no em or en dashes", () => {
    for (const [name, lines] of Object.entries(LINES)) {
      expect(lines.length, name).toBeGreaterThanOrEqual(10);
      for (const l of lines) expect(/[–—]/.test(l.text), l.text).toBe(false);
    }
  });

  it("gives Bram the spec's samples verbatim, and a line for mending", () => {
    const said = LINES.Bram.map((l) => l.text);
    for (const sample of [
      "Hmph. Another landlubber. Mind the nets, they bite.",
      "Forty years at sea and the gulls still won't listen to a word I say.",
      "The boat's not broken. She's resting. ...Fine. She's a bit broken.",
      "Brought you a fish. Don't make a thing of it.",
    ])
      expect(said).toContain(sample);
    expect(LINES.Bram.length).toBeGreaterThanOrEqual(6);
    expect(LINES.Bram.some((l) => l.kind === "activity" && l.activity === "mend")).toBe(true);
  });

  it("gives Juniper lines of her own", () => {
    expect(LINES.Juniper.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps a tip back until its lesson is passed", () => {
    const tips = (passed: string[]): string[] => {
      let memory = freshMemory();
      const said: string[] = [];
      for (let i = 0; i < 30; i++) {
        const next = pickLine("Sam", memory, { ...quiet, passed });
        said.push(next.text);
        memory = next.memory;
      }
      return said.filter((t) => t.includes("range(1, 10)"));
    };
    expect(tips([])).toEqual([]);
    expect(tips(["loops"]).length).toBeGreaterThan(0);
  });

  it("says an activity line only during that activity", () => {
    const all = (activity: LineContext["activity"]): string[] => {
      let memory = freshMemory();
      return Array.from({ length: 20 }, () => {
        const next = pickLine("Ines", memory, { ...quiet, activity });
        memory = next.memory;
        return next.text;
      });
    };
    expect(all(null)).not.toContain("Mind the broom!");
    expect(all("sweep")).toContain("Mind the broom!");
  });

  it("nudges only when something needs attention, and at most one line in four", () => {
    let memory = freshMemory();
    const said = Array.from({ length: 12 }, () => {
      const next = pickLine("Lou", memory, { ...quiet, nudge: "Water the plants" }, first);
      memory = next.memory;
      return next.text;
    });
    expect(said.filter((t) => t === "Water the plants").length).toBe(3);
    expect(said[0]).toBe("Water the plants");
    expect(said[1]).not.toBe("Water the plants");
    expect(pickLine("Lou", freshMemory(), quiet).text).not.toBe("Water the plants");
  });

  it("does not repeat a line before every fitting line was said", () => {
    let memory = freshMemory();
    const chatter = LINES.Mika.filter((l) => l.kind === "chatter").length;
    const said = Array.from({ length: chatter }, () => {
      const next = pickLine("Mika", memory, quiet);
      memory = next.memory;
      return next.text;
    });
    expect(new Set(said).size).toBe(chatter);
  });
});
