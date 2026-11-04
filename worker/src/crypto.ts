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

const hex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

export const WRAPPED_RECOVERY_PREFIX = "v2:";

// A recovery code holds about 38 bits, so a plain SHA-256 of it falls to one GPU in under a minute if the
// database ever leaks. Keyed with RECOVERY_KEY, which lives only in the Worker, a leaked hash cannot be tested
// offline. It wraps the plain hash, so the cron can upgrade old rows without knowing their codes.
export async function wrapRecoveryHash(key: string, plainHash: string): Promise<string> {
  if (!key) throw new Error("RECOVERY_KEY is not set: recovery codes cannot be hashed.");
  const encoder = new TextEncoder();
  const hmac = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return WRAPPED_RECOVERY_PREFIX + hex(await crypto.subtle.sign("HMAC", hmac, encoder.encode(plainHash)));
}

export async function recoveryHash(key: string, code: string): Promise<string> {
  return wrapRecoveryHash(key, await sha256Hex(normalizeRecoveryCode(code)));
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
