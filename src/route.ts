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
  | { name: "boss"; id: string };

export function parseRoute(hash: string): Route {
  const [, place = "", id = ""] = hash.split("/");
  if ((place === "lesson" || place === "boss") && id) return { name: place, id: decodeURIComponent(id) };
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
