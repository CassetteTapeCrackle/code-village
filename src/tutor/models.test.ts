import { expect, test } from "vitest";
import { modelParams } from "./models";

test("gemma 4 gets max_completion_tokens and no thinking", () => {
  expect(modelParams("@cf/google/gemma-4-26b-a4b-it", 300)).toEqual({
    max_completion_tokens: 300,
    chat_template_kwargs: { enable_thinking: false },
  });
});

test("gpt-oss and mistral get max_tokens", () => {
  expect(modelParams("@cf/openai/gpt-oss-20b", 300)).toEqual({ max_tokens: 300 });
  expect(modelParams("@cf/mistralai/mistral-small-3.1-24b-instruct", 300)).toEqual({ max_tokens: 300 });
});
