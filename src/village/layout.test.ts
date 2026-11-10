import { expect, test } from "vitest";
import { MAP_H, MAP_W, PLACES, PLAZA, RIVER_X, STREET_Y, VY, buildMap, inside, walkable } from "./layout";
import { SHORE_WALK_ROW } from "./areas";
import { findPath } from "./paths";
import { groundStyle } from "./terrain";

const SHORE_Y = 64;

const map = buildMap(["w1", "w2", "w3", "w4"]); // every road open, so every door can be checked

test("the map has the declared size", () => {
  expect(map.tiles).toHaveLength(MAP_H);
  expect(new Set(map.tiles.map((r) => r.length))).toEqual(new Set([MAP_W]));
});

test("every door is on the path network and reachable from the plaza", () => {
  for (const place of PLACES) {
    expect(walkable(map, place.door.x, place.door.y), place.id).toBe(true);
    expect(findPath(map, PLAZA.center, place.door), place.id).not.toBeNull();
  }
});

test("no path runs through a building and no two places overlap", () => {
  for (const place of PLACES) {
    for (let y = place.y; y < place.y + place.h; y++) {
      for (let x = place.x; x < place.x + place.w; x++) {
        expect(map.tiles[y][x], `${place.id} at ${x},${y}`).toBe("B");
        for (const other of PLACES) if (other !== place) expect(inside(other, x, y)).toBe(false);
      }
    }
  }
});

test("buildings stay off the river, and the street crosses it on a bridge", () => {
  for (const place of PLACES)
    for (const x of RIVER_X) expect(x >= place.x && x < place.x + place.w).toBe(false);
  const bridges = map.tiles.flatMap((row, y) =>
    [...row].flatMap((t, x) => (t === "#" && y >= VY && y < SHORE_Y ? [{ x, y }] : [])),
  ); // the mountain path and the shore path have their own bridges
  expect(bridges).toEqual(RIVER_X.map((x) => ({ x, y: STREET_Y })));
});

test("the long jetty is walkable from the walkway to its end", () => {
  for (let y = SHORE_WALK_ROW + 1; y <= 82; y++) expect(["=", "#"], `row ${y}`).toContain(map.tiles[y][73]);
  expect(map.tiles[82][73]).toBe("#"); // the end tile is bridge over the sea
  expect(findPath(map, PLAZA.center, { x: 73, y: 82 })).not.toBeNull();
});

test("a path is a contiguous walk ending at the door; an unreachable tile gives null", () => {
  const school = PLACES.find((p) => p.id === "school")!;
  const path = findPath(map, PLAZA.center, school.door)!;
  expect(path[0]).toEqual(PLAZA.center);
  expect(path.at(-1)).toEqual(school.door);
  for (let i = 1; i < path.length; i++) {
    expect(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y)).toBe(1);
  }
  expect(findPath(map, PLAZA.center, { x: 0, y: 0 })).toBeNull();
});

test("shore doors open onto the walkway row; the old row-76 road is gone", () => {
  const shore = PLACES.filter((p) => p.world === "w4");
  expect(PLACES.find((p) => p.id === "harbour")!.door.y).toBe(SHORE_WALK_ROW);
  expect(shore.map((p) => p.lair ?? p.kind).sort()).toEqual(["hall", "lighthouse", "pools", "wreck"]);
  // only the long jetty's approach crosses the old row-76 line now
  expect([...map.tiles[76]].flatMap((t, x) => (t === "=" ? [x] : []))).toEqual([73]);
});

test("the river bends but stays one stream, never touches a building, and keeps both bridges", () => {
  for (let y = 8; y < MAP_H; y++) {
    // West of the headland (x < 90): the headland's far side has its own sea, so the one-stream
    // check stays on the river and the sea it flows into.
    const water = [...map.tiles[y]].flatMap((t, x) => ("~#".includes(t) && x > 70 && x < 90 ? [x] : []));
    expect(water.length, `row ${y}`).toBeGreaterThan(0);
    expect(water.at(-1)! - water[0] + 1, `row ${y} is one stream`).toBe(water.length);
  }
  for (const place of PLACES) {
    // the tide pools and the wreck are coastal lairs that sit at the sea by design, not the river
    if (place.lair === "pools" || place.lair === "wreck") {
      for (let y = place.y - 1; y <= place.y + place.h; y++)
        for (let x = place.x - 1; x <= place.x + place.w; x++)
          if (map.tiles[y]?.[x] === "~")
            expect(groundStyle(x + 0.5, y + 0.5), `${place.id} ${x},${y}`).toBe("sea");
      continue;
    }
    for (let y = place.y - 1; y <= place.y + place.h; y++)
      for (let x = place.x - 1; x <= place.x + place.w; x++)
        expect(map.tiles[y]?.[x], place.id).not.toBe("~");
  }
  for (const y of [14, 46]) for (const x of RIVER_X) expect(map.tiles[y][x]).toBe("#");
});
