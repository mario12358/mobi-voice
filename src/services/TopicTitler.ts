import type { LlmEngine } from '../engines/types';
import { TITLE_SYSTEM_PROMPT, titleUserPrompt } from './prompts';

const MAX_TITLE_CHARS = 60;
const MAX_TITLE_TOKENS = 24;

// Small models add quotes, a "Tytuł:" prefix or a trailing period despite the instruction.
export function cleanTitle(raw: string): string {
  const firstLine = raw.trim().split('\n')[0] ?? '';
  const withoutLabel = firstLine.replace(/^tytuł\s*:\s*/i, '');
  // Guillemets and Polish quotes are written as \u escapes: typographic quotes break string literals.
  const withoutQuotes = withoutLabel.replace(/^["'\u00AB\u201E*]+|["'\u00BB\u201D*]+$/g, '');
  const withoutPeriod = withoutQuotes.replace(/[.!]+$/, '').trim();
  return withoutPeriod.length <= MAX_TITLE_CHARS
    ? withoutPeriod
    : `${withoutPeriod.slice(0, MAX_TITLE_CHARS - 1)}…`;
}

export class TopicTitler {
  constructor(private readonly llm: () => LlmEngine) {}

  async generate(question: string, answer: string): Promise<string> {
    const result = await this.llm().generate(
      {
        systemPrompt: TITLE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: titleUserPrompt(question, answer) }],
        maxTokens: MAX_TITLE_TOKENS,
      },
      () => undefined,
      new AbortController().signal,
    );
    return cleanTitle(result.text);
  }
}
