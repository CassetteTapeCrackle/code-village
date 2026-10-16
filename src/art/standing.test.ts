import { expect, test } from "vitest";
import { beginCapture, covering, endCapture, pieces, touch } from "./standing";

// A picture from text rows: "#" is opaque, "." transparent.
const picture = (rows: string[]): [Uint8ClampedArray, number, number] => {
  const w = rows[0].length;
  const data = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => ch === "#" && data.set([1, 2, 3, 255], (y * w + x) * 4)),
  );
  return [data, w, rows.length];
};

test("a tree is one piece with its feet at the bottom of its trunk", () => {
  const [data, w, h] = picture([".###.", "#####", ".###.", "..#..", "..#.."]);
  const [tree, ...rest] = pieces(data, w, h, 10, 20);
  expect(rest).toEqual([]);
  expect({ x: tree.x, y: tree.y, w: tree.w, h: tree.h, feet: tree.feet }).toEqual({
    x: 10,
    y: 20,
    w: 5,
    h: 5,
    feet: 24,
  });
});

test("two lamps apart are two pieces, each with its own feet", () => {
  const [data, w, h] = picture(["#......", "#.....#", "#.....#"]);
  const lamps = pieces(data, w, h, 0, 0);
  expect(lamps.map((l) => [l.x, l.feet])).toEqual([
    [0, 2],
    [6, 2],
  ]);
  expect(lamps[1].h).toBe(2);
});

test("a 1 px gap keeps one piece, and each piece keeps only its own pixels", () => {
  const [data, w, h] = picture(["#.#"]);
  const [one, ...rest] = pieces(data, w, h, 0, 0);
  expect(rest).toEqual([]);
  expect([...one.data.filter((_, i) => i % 4 === 3)]).toEqual([255, 0, 255]);
});

test("a walker is covered only by what overlaps it and stands lower", () => {
  const tree = { x: 10, y: 10, w: 11, h: 11, feet: 20 };
  const far = { x: 50, y: 10, w: 11, h: 11, feet: 20 };
  const behind = { x: 10, y: 0, w: 11, h: 11, feet: 10 };
  const walker = { x: 12, y: 4, w: 12, h: 12 };
  expect(covering([tree, far, behind], walker, 15)).toEqual([tree]);
  expect(covering([tree], walker, 22)).toEqual([]);
});

test("the capture box grows with what is drawn, and nothing is recorded outside a capture", () => {
  touch(5, 5);
  beginCapture();
  touch(3, 4, 2, 2);
  touch(10.5, 1);
  expect(endCapture()).toEqual({ x: 3, y: 1, w: 9, h: 5 });
  beginCapture();
  expect(endCapture()).toBeNull();
});
