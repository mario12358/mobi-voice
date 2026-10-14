import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import type { Summary, SummaryRepository } from '../db/repositories/SummaryRepository';
import type { Topic, TopicRepository } from '../db/repositories/TopicRepository';
import { DomainError } from '../core/errors';
import type { LlmEngine } from '../engines/types';
import type { ModelBudget } from './ContextBuilder';
import { CHARS_PER_TOKEN, estimateTextTokens } from './tokens';

// Model-facing instructions (not UI text). Polish, because the conversations are.
export const SUMMARY_SYSTEM_PROMPT =
  'Podsumowujesz rozmowę użytkownika z asystentem. Opierasz się wyłącznie na jej treści, piszesz po polsku.';
export const PART_NOTES_INSTRUCTION =
  'To fragment dłuższej rozmowy. Zanotuj zwięźle w punktach wszystkie fakty, liczby, nazwy, decyzje i otwarte sprawy z tego fragmentu.';
export const MERGE_INTRO = 'Poniżej notatki z kolejnych części jednej rozmowy, w kolejności.';

const MAX_PASSES = 4;

export interface SummaryRequest {
  instruction: string;
  // The saved template used, or null for a one-off instruction.
  templateId: number | null;
}

interface Deps {
  topics: TopicRepository;
  messages: MessageRepository;
  summaries: SummaryRepository;
  llm: () => LlmEngine;
  budget: (topic: Topic) => ModelBudget;
  model: (topic: Topic) => string;
}

function transcript(messages: Message[]): string {
  return messages
    .map((message) => `${message.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${message.content}`)
    .join('\n');
}

// Whole-topic summaries in the chosen form (MV-SUM-1). A history larger than the model's context is
// summarized in stages: notes from consecutive parts, then the requested form from those notes.
export class SummaryService {
  constructor(private readonly deps: Deps) {}

  async generate(topicId: number, request: SummaryRequest, signal?: AbortSignal): Promise<Summary> {
    const topic = await this.deps.topics.getById(topicId);
    if (topic === null) throw new DomainError('topic_not_found', `Topic ${topicId}`);
    const messages = await this.deps.messages.listByTopic(topicId);
    const budget = this.deps.budget(topic);
    // Room for the conversation text in one request: context minus the answer and the instructions.
    const room =
      budget.contextTokens -
      budget.maxOutputTokens -
      estimateTextTokens(SUMMARY_SYSTEM_PROMPT + PART_NOTES_INSTRUCTION + request.instruction) -
      64;
    const material = await this.condense([transcript(messages)], room, topic, signal);
    const content = await this.ask(
      topic,
      `${request.instruction}\n\n${material}`,
      budget.maxOutputTokens,
      signal,
    );
    return this.deps.summaries.add(topicId, request.templateId, content);
  }

  latest(topicId: number): Promise<Summary | null> {
    return this.deps.summaries.latest(topicId);
  }

  // Shrinks the text until it fits one request: each pass turns parts into notes. A model that
  // ignores the length limit would never fit, so after a few passes the notes are cut to size.
  private async condense(
    texts: string[],
    room: number,
    topic: Topic,
    signal?: AbortSignal,
    pass = 0,
  ): Promise<string> {
    const whole = texts.join('\n\n');
    if (estimateTextTokens(whole) <= room) return whole;
    if (pass >= MAX_PASSES) return this.split(whole, room)[0] ?? '';
    const parts = this.split(whole, room);
    const notes: string[] = [];
    for (const [index, part] of parts.entries()) {
      const share = Math.floor(room / parts.length);
      const note = await this.ask(topic, `${PART_NOTES_INSTRUCTION}\n\n${part}`, share, signal);
      // A model may write past its limit; the notes must still shrink with every pass.
      notes.push(`Część ${index + 1}:\n${note.slice(0, share * CHARS_PER_TOKEN)}`);
    }
    return this.condense([MERGE_INTRO, ...notes], room, topic, signal, pass + 1);
  }

  // Cuts at line ends, so no message is split in the middle when it can be avoided.
  private split(text: string, room: number): string[] {
    const limit = Math.max(1, room) * CHARS_PER_TOKEN;
    const parts: string[] = [];
    let current = '';
    for (const line of text.split('\n')) {
      if (current.length > 0 && current.length + line.length + 1 > limit) {
        parts.push(current);
        current = '';
      }
      current = current.length === 0 ? line : `${current}\n${line}`;
      while (current.length > limit) {
        parts.push(current.slice(0, limit));
        current = current.slice(limit);
      }
    }
    if (current.length > 0) parts.push(current);
    return parts;
  }

  private async ask(topic: Topic, prompt: string, maxTokens: number, signal?: AbortSignal): Promise<string> {
    const result = await this.deps.llm().generate(
      {
        systemPrompt: SUMMARY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: Math.max(64, maxTokens),
        model: this.deps.model(topic),
      },
      () => undefined,
      signal ?? new AbortController().signal,
    );
    return result.text.trim();
  }
}
