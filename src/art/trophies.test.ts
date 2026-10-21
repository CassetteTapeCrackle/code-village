import { expect, test } from "vitest";
import { bundle } from "../content/bundle";
import { TROPHY_SPRITES } from "./trophies";

test("every drawn trophy is a real one, 12 by 12, and looks like no other", () => {
  const all = bundle.bosses.flatMap((b) => [b.trophy.id, b.hardTrophy.id]);
  expect(Object.keys(TROPHY_SPRITES).filter((id) => !all.includes(id))).toEqual([]);
  // a new world's trophies may have no sprite yet: they show the star icon, and the cheat page lists them
  const ids = all.filter((id) => TROPHY_SPRITES[id]);
  for (const id of ids) {
    expect(TROPHY_SPRITES[id], id).toHaveLength(12);
    expect(
      TROPHY_SPRITES[id].every((row) => row.length === 12),
      id,
    ).toBe(true);
  }
  expect(new Set(ids.map((id) => TROPHY_SPRITES[id].join())).size).toBe(ids.length); // no two look the same
});
