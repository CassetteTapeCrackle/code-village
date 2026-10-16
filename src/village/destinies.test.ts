import { describe, expect, it } from "vitest";
import { bundle } from "../content/bundle";
import { DESTINIES, ITEM_SPRITES, SCENE_FEATURES, newScenes } from "./destinies";

describe("item destinies", () => {
  const loot = bundle.lessons.map((l) => l.loot.id);

  it("gives every lesson item exactly one destiny and its own sprite", () => {
    expect(Object.keys(DESTINIES).sort()).toEqual([...loot].sort());
    for (const id of loot) expect(ITEM_SPRITES[id], id).toBeDefined();
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
