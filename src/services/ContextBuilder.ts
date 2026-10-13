import type { ChatMessage, LlmEngine, LlmRequest } from '../engines/types';
import type { ContextSummaryRepository } from '../db/repositories/ContextSummaryRepository';
import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import {
  SUMMARIZER_SYSTEM_PROMPT,
  summarizerUserPrompt,
  withContextSummary,
  CONTEXT_SUMMARY_HEADER,
} from './prompts';
import { estimateMessageTokens, estimateSystemTokens, estimateTextTokens } from './tokens';

export interface ModelBudget {
  contextTokens: number;
  maxOutputTokens: number;
}

export interface Summarizer {
  summarize(previousSummary: string | null, messages: ChatMessage[], maxTokens: number): Promise<string>;
}

export interface BuiltContext {
  request: LlmRequest;
  includedMessageIds: number[];
  summaryUsed: boolean;
  estimatedTokens: number;
}

// Share of the input budget reserved for the rolling summary when the history does not fit.
const SUMMARY_SHARE = 0.25;
const CHARS_PER_TOKEN_FLOOR = 3;

function toChat(message: Message): ChatMessage {
  return { role: message.role, content: message.content };
}

function historyTokens(messages: Message[]): number {
  return messages.reduce((total, message) => total + estimateMessageTokens(toChat(message)), 0);
}

// Keeps the end of a text so that it fits the token budget (the newest words matter most).
function clipToTokens(text: string, maxTokens: number): string {
  const maxChars = Math.max(0, maxTokens * CHARS_PER_TOKEN_FLOOR);
  return text.length <= maxChars ? text : text.slice(text.length - maxChars);
}

function newestThatFit(history: Message[], budget: number): Message[] {
  const window: Message[] = [];
  let used = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (message === undefined) break;
    const cost = estimateMessageTokens(toChat(message));
    if (used + cost > budget) break;
    window.unshift(message);
    used += cost;
  }
  return window;
}

// The latest message is always sent — clipped from the front if it alone exceeds the window.
function withLatestMessage(history: Message[], window: Message[], budget: number): Message[] {
  const latest = history.at(-1);
  if (latest === undefined || window.length > 0) return window;
  const overhead = estimateMessageTokens({ role: latest.role, content: '' });
  return [{ ...latest, content: clipToTokens(latest.content, budget - overhead) }];
}

export class LlmSummarizer implements Summarizer {
  constructor(private readonly llm: LlmEngine) {}

  async summarize(
    previousSummary: string | null,
    messages: ChatMessage[],
    maxTokens: number,
  ): Promise<string> {
    const result = await this.llm.generate(
      {
        systemPrompt: SUMMARIZER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: summarizerUserPrompt(previousSummary, messages) }],
        maxTokens,
      },
      () => undefined,
      new AbortController().signal,
    );
    return result.text.trim();
  }
}

// System prompt + rolling summary of older messages + newest messages within the model's budget (S1).
export class ContextBuilder {
  constructor(
    private readonly messages: MessageRepository,
    private readonly summaries: ContextSummaryRepository,
    private readonly summarizer: Summarizer,
  ) {}

  async build(topicId: number, systemPrompt: string | null, budget: ModelBudget): Promise<BuiltContext> {
    const history = await this.messages.listByTopic(topicId);
    const inputBudget = budget.contextTokens - budget.maxOutputTokens;
    const systemTokens = estimateSystemTokens(systemPrompt);
    if (systemTokens + historyTokens(history) <= inputBudget) {
      return this.result(systemPrompt, history, false);
    }

    const summaryBudget = Math.floor(inputBudget * SUMMARY_SHARE);
    const windowBudget = inputBudget - systemTokens - summaryBudget;
    const window = withLatestMessage(history, newestThatFit(history, windowBudget), windowBudget);
    const older = history.slice(0, history.length - window.length);
    if (older.length === 0) return this.result(systemPrompt, window, false);

    const summary = await this.summaryCovering(topicId, older, summaryBudget);
    return this.result(withContextSummary(systemPrompt, summary), window, true);
  }

  private async summaryCovering(topicId: number, older: Message[], summaryBudget: number): Promise<string> {
    const lastOlderId = older.at(-1)?.id ?? 0;
    const stored = await this.summaries.get(topicId);
    const contentBudget = summaryBudget - estimateTextTokens(CONTEXT_SUMMARY_HEADER) - 4;
    if (stored !== null && stored.coversUntilMessageId >= lastOlderId) {
      return clipToTokens(stored.content, contentBudget);
    }
    const uncovered = older.filter((message) => message.id > (stored?.coversUntilMessageId ?? 0));
    const fresh = await this.summarizer.summarize(
      stored?.content ?? null,
      uncovered.map(toChat),
      contentBudget,
    );
    const content = clipToTokens(fresh, contentBudget);
    await this.summaries.save(topicId, content, lastOlderId);
    return content;
  }

  private result(systemPrompt: string | null, window: Message[], summaryUsed: boolean): BuiltContext {
    const messages = window.map(toChat);
    return {
      request: { systemPrompt, messages },
      includedMessageIds: window.map((message) => message.id),
      summaryUsed,
      estimatedTokens: estimateSystemTokens(systemPrompt) + historyTokens(window),
    };
  }
}
