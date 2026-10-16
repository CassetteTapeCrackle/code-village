import { expect, test } from "vitest";
import { TILE } from "./grid";
import { buildMap, PLACES } from "./layout";
import { pathMask, pathNode } from "./ribbons";
import { featureLand } from "./scenery";

const map = buildMap(["w1", "w2", "w3"], featureLand());

test("the ribbon meets doors, bridges and the plaza square on", () => {
  const school = PLACES.find((p) => p.id === "school")!;
  expect(pathNode(map, school.door.x, school.door.y)).toEqual({
    x: school.door.x * TILE + 3.5,
    y: school.door.y * TILE + 3.5,
  });
  expect(pathNode(map, 81, 46)).toEqual({ x: 81 * TILE + 3.5, y: 46 * TILE + 3.5 });
  expect(pathNode(map, 68, 46)).toEqual({ x: 68 * TILE + 3.5, y: 46 * TILE + 3.5 });
});

test("every path tile's centre lies on the ribbon", () => {
  const m = pathMask(map);
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      if (!"=PG#".includes(map.tiles[ty][tx])) continue;
      const n = pathNode(map, tx, ty);
      expect(m.inside[Math.floor(n.y) * m.width + Math.floor(n.x)], `${tx},${ty}`).toBe(1);
    }
  }
});
