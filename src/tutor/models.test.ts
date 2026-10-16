import { expect, test } from "vitest";
import { limitParam } from "./models";

test("gemma 4 gets max_completion_tokens", () => {
  expect(limitParam("@cf/google/gemma-4-26b-a4b-it", 300)).toEqual({ max_completion_tokens: 300 });
});

test("gpt-oss and mistral get max_tokens", () => {
  expect(limitParam("@cf/openai/gpt-oss-20b", 300)).toEqual({ max_tokens: 300 });
  expect(limitParam("@cf/mistralai/mistral-small-3.1-24b-instruct", 300)).toEqual({ max_tokens: 300 });
});
