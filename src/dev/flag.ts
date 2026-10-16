// Cheat tools: always in a development build, and in a production build made with VITE_CHEAT=1.
export function cheatsEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_CHEAT === "1";
}

// The corner tag marks a build that carries the cheat tools into production.
export function cheatBuild(): boolean {
  return !import.meta.env.DEV && import.meta.env.VITE_CHEAT === "1";
}
