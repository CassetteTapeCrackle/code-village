import { WORDS } from "./words.ts";

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const words = [...bytes.slice(0, 4)].map((b) => WORDS[b]);
  return `${words.join("-")}-${String(bytes[4] % 100).padStart(2, "0")}`;
}

export function normalizeRecoveryCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .join("-");
}
