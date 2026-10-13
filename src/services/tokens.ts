import type { ChatMessage } from '../engines/types';

// Without the model's tokenizer in JS we over-estimate: Polish text averages ~3.5–4 characters per
// token in Qwen/Llama/Gemma vocabularies, so 3 keeps the real prompt under the budget.
const CHARS_PER_TOKEN = 3;
// Role markers and separators added by chat templates.
const MESSAGE_OVERHEAD_TOKENS = 8;

export function estimateTextTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateMessageTokens(message: ChatMessage): number {
  return estimateTextTokens(message.content) + MESSAGE_OVERHEAD_TOKENS;
}

export function estimateSystemTokens(systemPrompt: string | null): number {
  return systemPrompt === null ? 0 : estimateTextTokens(systemPrompt) + MESSAGE_OVERHEAD_TOKENS;
}
