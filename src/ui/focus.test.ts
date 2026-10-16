import { expect, test } from "vitest";
import { bundle } from "../content/bundle";
import { parseRoute } from "../route";
import { focusFor } from "./focus";

const focus = (hash: string) => focusFor(parseRoute(hash), bundle);

test("the village map itself has no board and nothing in focus", () => {
  expect(focus("#/").place).toBeNull();
});

test("each place's board focuses its own building and closes back to the map", () => {
  expect(focus("#/school")).toEqual({ place: "school", back: "#/", backLabel: "Back to the map" });
  expect(focus("#/garden").place).toBe("garden");
  expect(focus("#/library").place).toBe("library");
  expect(focus("#/house").place).toBe("house");
});

test("another world's school is its own building", () => {
  expect(focus("#/school/w2").place).toBe("cabin");
  expect(focus("#/school/w3").place).toBe("observatory");
});

test("a lesson sits at its world's school and closes back to that school", () => {
  expect(focus("#/lesson/values")).toEqual({
    place: "school",
    back: "#/school",
    backLabel: "Back to School",
  });
  const forest = bundle.lessons.find((l) => l.world === "w2");
  if (forest)
    expect(focus(`#/lesson/${forest.id}`)).toEqual({
      place: "cabin",
      back: "#/school/w2",
      backLabel: "Back to Ranger's cabin",
    });
});

test("a boss is fought at its lair", () => {
  expect(focus("#/boss/guessing-stone").place).toBe("quarry");
  expect(focus("#/boss/gradebook").place).toBe("marsh");
});

test("pages with no building, and unknown ids, dim the whole map", () => {
  expect(focus("#/sandbox").place).toBeNull();
  expect(focus("#/lesson/no-such-lesson").place).toBeNull();
  expect(focus("#/boss/no-such-boss").place).toBeNull();
});
