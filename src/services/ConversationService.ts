import { DomainError, isDomainError } from '../core/errors';
import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import type { Topic, TopicRepository } from '../db/repositories/TopicRepository';
import type { LlmEngine } from '../engines/types';
import type { ContextBuilder, ModelBudget } from './ContextBuilder';
import type { TopicTitler } from './TopicTitler';

export interface ConversationDependencies {
  topics: TopicRepository;
  messages: MessageRepository;
  context: ContextBuilder;
  llm: () => LlmEngine;
  budget: (topic: Topic) => ModelBudget;
  systemPrompt: (topic: Topic) => string | null;
  titler?: TopicTitler;
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
  // Set when the first exchange gave a placeholder-titled topic its generated title.
  newTitle: string | null;
  // Titling is cosmetic: its failure keeps the placeholder and is reported here, not thrown.
  titleError: DomainError | null;
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
      return {
        userMessage,
        assistantMessage: null,
        interrupted: result.aborted,
        newTitle: null,
        titleError: null,
      };
    }
    const assistantMessage = await this.deps.messages.add({
      topicId,
      role: 'assistant',
      content: answer,
      interrupted: result.aborted,
    });
    const titling = await this.titleIfFirstExchange(topic, content, answer);
    return { userMessage, assistantMessage, interrupted: result.aborted, ...titling };
  }

  private async titleIfFirstExchange(
    topic: Topic,
    question: string,
    answer: string,
  ): Promise<Pick<Exchange, 'newTitle' | 'titleError'>> {
    const { titler } = this.deps;
    if (titler === undefined || topic.titleSource !== 'default') return { newTitle: null, titleError: null };
    try {
      const title = await titler.generate(question, answer);
      const applied = title.length > 0 && (await this.deps.topics.applyAutoTitle(topic.id, title));
      return { newTitle: applied ? title : null, titleError: null };
    } catch (error) {
      const titleError = isDomainError(error)
        ? error
        : new DomainError('provider_error', 'title', { cause: error });
      return { newTitle: null, titleError };
    }
  }
}
