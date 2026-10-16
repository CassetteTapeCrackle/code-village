// Workers AI token limit parameter. Gemma 4 deprecated max_tokens for max_completion_tokens;
// the gpt-oss and Mistral models take max_tokens (checked on the model pages, 2026-10-15).
export function limitParam(
  model: string,
  tokens: number,
): { max_tokens: number } | { max_completion_tokens: number } {
  return model.startsWith("@cf/google/gemma") ? { max_completion_tokens: tokens } : { max_tokens: tokens };
}
