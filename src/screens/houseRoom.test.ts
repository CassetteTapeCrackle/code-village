import { expect, test } from "vitest";
import { DESTINIES, ITEM_SPRITES } from "../village/destinies";
import { HOME_SPOTS } from "./houseRoom";

test("every home item has its own place in the room, and no two overlap", () => {
  const home = Object.entries(DESTINIES).flatMap(([id, d]) => (d.kind === "house" ? [id] : []));
  expect(Object.keys(HOME_SPOTS).sort()).toEqual(home.sort());
  const boxes = Object.entries(HOME_SPOTS).map(([id, p]) => ({
    id,
    x0: p.x,
    y0: p.y,
    x1: p.x + ITEM_SPRITES[id][0].length,
    y1: p.y + ITEM_SPRITES[id].length,
  }));
  for (const a of boxes)
    for (const b of boxes)
      if (a !== b)
        expect(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${a.id} and ${b.id}`).toBe(
          true,
        );
});
