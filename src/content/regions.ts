// Region names from the spec (section 3), keyed by world then region letter.
const REGION_NAMES: Record<string, Record<string, string>> = {
  w1: { a: "First programs", b: "Collections", c: "Structure" },
  w2: { a: "Classes", b: "Behaviour", c: "Families" },
  w3: { a: "Data", b: "Numbers", c: "A first model" },
};

export function regionName(world: string, region: string): string {
  return REGION_NAMES[world]?.[region] ?? `Region ${region}`;
}
