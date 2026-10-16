import { expect, test } from "vitest";
import { newRecoveryCode, normalizeRecoveryCode, randomToken, sha256Hex } from "../src/crypto";
import { WORDS } from "../src/words";

test("randomToken is 43 base64url chars and two calls differ", () => {
  const a = randomToken();
  const b = randomToken();
  expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(b).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a).not.toBe(b);
});

test("sha256Hex matches the known digest of abc", async () => {
  expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("recovery codes are four words plus two digits", () => {
  for (let i = 0; i < 10; i++) expect(newRecoveryCode()).toMatch(/^([a-z]{3,7}-){4}\d{2}$/);
});

test("normalizeRecoveryCode forgives case, spaces and separators", () => {
  expect(normalizeRecoveryCode("  Maple Otter_brick--LANTERN 42 ")).toBe("maple-otter-brick-lantern-42");
});

test("the word list is 256 distinct friendly words", () => {
  expect(WORDS.length).toBe(256);
  expect(new Set(WORDS).size).toBe(256);
  for (const word of WORDS) expect(word).toMatch(/^[a-z]{3,7}$/);
});
