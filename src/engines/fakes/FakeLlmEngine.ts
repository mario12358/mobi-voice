import { SUMMARY_SYSTEM_PROMPT, TITLE_SYSTEM_PROMPT } from '../../services/prompts';
import type { LlmEngine, LlmRequest, LlmResult } from '../types';

export type LlmScript = (request: LlmRequest) => string;

export const ECHO_SCRIPT: LlmScript = (request) => {
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  return `Odpowiedź testowa na: ${lastUser?.content ?? ''}. To jest drugie zdanie.`;
};

// e2e builds: a question containing "długo" gets a long answer so the test can press STOP mid-stream.
export const E2E_LONG_ANSWER_TRIGGER = 'długo';

export const E2E_TOPIC_TITLE = 'Rozmowa testowa';

// A summary names the form it was asked for (the first line of the prompt is the instruction).
export const E2E_SUMMARY_PREFIX = 'Podsumowanie testowe';

export const E2E_SCRIPT: LlmScript = (request) => {
  if (request.systemPrompt === TITLE_SYSTEM_PROMPT) return E2E_TOPIC_TITLE;
  if (request.systemPrompt === SUMMARY_SYSTEM_PROMPT) {
    const instruction = request.messages[0]?.content.split('\n')[0] ?? '';
    return `${E2E_SUMMARY_PREFIX}. Forma: ${instruction}`;
  }
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  if (lastUser?.content.includes(E2E_LONG_ANSWER_TRIGGER)) {
    return Array.from({ length: 300 }, (_, index) => `Zdanie numer ${index + 1}.`).join(' ');
  }
  return ECHO_SCRIPT(request);
};

export function splitIntoTokens(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class FakeLlmEngine implements LlmEngine {
  readonly requests: LlmRequest[] = [];

  constructor(
    private readonly script: LlmScript = ECHO_SCRIPT,
    private readonly tokenDelayMs = 0,
  ) {}

  async generate(
    request: LlmRequest,
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<LlmResult> {
    this.requests.push(request);
    let text = '';
    for (const token of splitIntoTokens(this.script(request))) {
      await wait(this.tokenDelayMs);
      if (signal.aborted) return { text, aborted: true };
      text += token;
      onToken(token);
    }
    return { text, aborted: false };
  }
}
