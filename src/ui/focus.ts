import type { Bundle } from "../content/types";
import type { Route } from "../route";
import { PLACES, lairOf } from "../village/layout";

// Which building a page belongs to (the village keeps it lit beside the board) and where the board's close leads.
export type Focus = { place: string | null; back: string; backLabel: string };

const SCHOOLS: Record<string, string> = { w1: "school", w2: "cabin", w3: "observatory" };
const MAP: Focus = { place: null, back: "#/", backLabel: "Back to the map" };

export function focusFor(route: Route, bundle: Bundle): Focus {
  switch (route.name) {
    case "school":
      return { ...MAP, place: SCHOOLS[route.world ?? "w1"] ?? null };
    case "garden":
    case "library":
    case "house":
      return { ...MAP, place: route.name };
    case "lesson": {
      const lesson = bundle.lessons.find((l) => l.id === route.id);
      const school = lesson && PLACES.find((p) => p.id === SCHOOLS[lesson.world]);
      if (!lesson || !school) return MAP;
      return {
        place: school.id,
        back: lesson.world === "w1" ? "#/school" : `#/school/${lesson.world}`,
        backLabel: `Back to ${school.name}`,
      };
    }
    case "boss": {
      const boss = bundle.bosses.find((b) => b.id === route.id);
      return { ...MAP, place: (boss && lairOf(boss.world, boss.region)?.id) ?? null };
    }
    default:
      return MAP;
  }
}
