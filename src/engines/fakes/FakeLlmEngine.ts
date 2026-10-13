import type { LlmEngine, LlmRequest, LlmResult } from '../types';

export type LlmScript = (request: LlmRequest) => string;

export const ECHO_SCRIPT: LlmScript = (request) => {
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  return `Odpowiedź testowa na: ${lastUser?.content ?? ''}. To jest drugie zdanie.`;
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
