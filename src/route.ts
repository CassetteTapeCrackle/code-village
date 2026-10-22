export type Route =
  | { name: "home" }
  | { name: "school"; world?: string }
  | { name: "cheat" }
  | { name: "garden" }
  | { name: "library" }
  | { name: "house" }
  | { name: "sandbox" }
  | { name: "board" }
  | { name: "lesson"; id: string }
  | { name: "boss"; id: string; skip?: boolean };

export function parseRoute(hash: string): Route {
  const [, place = "", id = "", flag = ""] = hash.split("/");
  if (place === "lesson" && id) return { name: "lesson", id: decodeURIComponent(id) };
  if (place === "boss" && id) {
    const boss = { name: "boss" as const, id: decodeURIComponent(id) };
    return flag === "skip" ? { ...boss, skip: true } : boss;
  }
  if (place === "school" && id) return { name: "school", world: decodeURIComponent(id) };
  if (
    place === "cheat" ||
    place === "school" ||
    place === "garden" ||
    place === "library" ||
    place === "house" ||
    place === "sandbox" ||
    place === "board"
  )
    return { name: place };
  return { name: "home" };
}
