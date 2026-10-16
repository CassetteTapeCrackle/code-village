import { expect, test } from "vitest";
import { bundle } from "../content/bundle";
import { TROPHY_SPRITES } from "./trophies";

test("every trophy in the content has its own 12 by 12 sprite", () => {
  const ids = bundle.bosses.flatMap((b) => [b.trophy.id, b.hardTrophy.id]);
  expect(ids.filter((id) => !TROPHY_SPRITES[id])).toEqual([]);
  for (const id of ids) {
    expect(TROPHY_SPRITES[id], id).toHaveLength(12);
    expect(
      TROPHY_SPRITES[id].every((row) => row.length === 12),
      id,
    ).toBe(true);
  }
  expect(new Set(ids.map((id) => TROPHY_SPRITES[id].join())).size).toBe(ids.length); // no two look the same
});
