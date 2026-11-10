import { describe, expect, it } from "vitest";
import { bundle } from "../content/bundle";
import { DESTINIES, ITEM_SPRITES, SCENE_FEATURES, newScenes } from "./destinies";

describe("item destinies", () => {
  const loot = bundle.lessons.map((l) => l.loot.id);

  // a new world's items may have no sprite yet: they show the sprout icon, and the cheat page lists them
  it("draws only real lesson items and gives each drawn one a destiny", () => {
    expect(Object.keys(ITEM_SPRITES).filter((id) => !loot.includes(id))).toEqual([]);
    expect(Object.keys(DESTINIES).sort()).toEqual(Object.keys(ITEM_SPRITES).sort());
  });

  it("sends twenty five items into the world and eight into the house", () => {
    expect(SCENE_FEATURES).toHaveLength(25);
    expect(Object.values(DESTINIES).filter((d) => d.kind === "house")).toHaveLength(loot.length - 25);
  });
});

describe("new on the map", () => {
  const features = [{ id: "swing", at: { x: 64, y: 61 }, label: "a swing on the big old tree" }];
  it("lists a found item's scene the player has not seen yet", () => {
    expect(newScenes(bundle.lessons, ["knotted-rope"], [], features)).toEqual([
      { feature: "swing", name: "Knotted Rope", label: "a swing on the big old tree", at: { x: 64, y: 61 } },
    ]);
    expect(newScenes(bundle.lessons, ["knotted-rope"], ["swing"], features)).toEqual([]);
  });
  it("shows nothing on a first visit, and nothing for house items", () => {
    expect(newScenes(bundle.lessons, ["knotted-rope"], null, features)).toBeNull();
    expect(newScenes(bundle.lessons, ["pebble-counter"], [], features)).toEqual([]);
  });
});
