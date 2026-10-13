import { DomainError } from '../core/errors';
import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import type { Topic, TopicRepository } from '../db/repositories/TopicRepository';
import type { LlmEngine } from '../engines/types';
import type { ContextBuilder, ModelBudget } from './ContextBuilder';

export interface ConversationDependencies {
  topics: TopicRepository;
  messages: MessageRepository;
  context: ContextBuilder;
  llm: () => LlmEngine;
  budget: (topic: Topic) => ModelBudget;
  systemPrompt: (topic: Topic) => string | null;
}

export interface SendOptions {
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export interface Exchange {
  userMessage: Message;
  // null when the model was stopped before it produced anything.
  assistantMessage: Message | null;
  interrupted: boolean;
}

// One user turn: store the question, build the context, stream the answer, store what was answered.
export class ConversationService {
  constructor(private readonly deps: ConversationDependencies) {}

  async send(topicId: number, text: string, options: SendOptions = {}): Promise<Exchange> {
    const topic = await this.deps.topics.getById(topicId);
    if (topic === null) throw new DomainError('topic_not_found', `Topic ${topicId}`);
    const content = text.trim();
    const userMessage = await this.deps.messages.add({ topicId, role: 'user', content });

    const { request } = await this.deps.context.build(
      topicId,
      this.deps.systemPrompt(topic),
      this.deps.budget(topic),
    );
    const signal = options.signal ?? new AbortController().signal;
    const result = await this.deps.llm().generate(request, (token) => options.onToken?.(token), signal);

    const answer = result.text.trim();
    if (answer.length === 0) {
      return { userMessage, assistantMessage: null, interrupted: result.aborted };
    }
    const assistantMessage = await this.deps.messages.add({
      topicId,
      role: 'assistant',
      content: answer,
      interrupted: result.aborted,
    });
    return { userMessage, assistantMessage, interrupted: result.aborted };
  }
}
