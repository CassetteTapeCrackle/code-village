import { worldById } from "../worlds/registry";

// Region names live in each world's world.toml.
export function regionName(world: string, region: string): string {
  return worldById(world)?.regions[region] ?? `Region ${region}`;
}
