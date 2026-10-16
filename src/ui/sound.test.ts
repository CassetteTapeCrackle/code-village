import { expect, test } from "vitest";
import { notesFor } from "./sound";

test("a pass rises, a miss is one low note, a fanfare ends on its longest note", () => {
  const pass = notesFor("pass").map((n) => n.freq);
  expect(pass).toEqual([...pass].sort((a, b) => a - b));
  expect(notesFor("fail")).toHaveLength(1);
  const fanfare = notesFor("fanfare");
  expect(Math.max(...fanfare.map((n) => n.length))).toBe(fanfare.at(-1)?.length);
});
