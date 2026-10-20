// Workers AI request parameters per model family. Gemma 4 deprecated max_tokens for
// max_completion_tokens; the gpt-oss and Mistral models take max_tokens (checked on the model
// pages, 2026-10-15). Gemma 4 also thinks before answering unless told not to: at a 300-token
// cap the thinking used every token and the reply came back empty (live check, 2026-10-20).
export type ModelParams =
  | { max_completion_tokens: number; chat_template_kwargs: { enable_thinking: false } }
  | { max_tokens: number };

export function modelParams(model: string, tokens: number): ModelParams {
  return model.startsWith("@cf/google/gemma")
    ? { max_completion_tokens: tokens, chat_template_kwargs: { enable_thinking: false } }
    : { max_tokens: tokens };
}
