import { DomainError, isDomainError } from '../core/errors';
import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import type { Topic, TopicRepository } from '../db/repositories/TopicRepository';
import type { LlmEngine, ToolCall, ToolDefinition } from '../engines/types';
import type { ContextBuilder, ModelBudget } from './ContextBuilder';
import type { TopicTitler } from './TopicTitler';

export interface ConversationDependencies {
  topics: TopicRepository;
  messages: MessageRepository;
  context: ContextBuilder;
  llm: () => LlmEngine;
  budget: (topic: Topic) => ModelBudget;
  // The model the topic talks to (its own choice or the global one), passed to the engine.
  model?: (topic: Topic) => string;
  systemPrompt: (topic: Topic) => string | null;
  titler?: TopicTitler;
  // Whether the topic's model may be offered tools: cloud models only (MV-CMD-1).
  toolsAllowed?: (topic: Topic) => boolean;
}

export interface SendOptions {
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  // Functions the model may call instead of answering, if its kind allows tools.
  tools?: ToolDefinition[];
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
  // The model called a tool: the question was a command, so it is not kept in the history.
  toolCall?: ToolCall;
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
    const model = this.deps.model?.(topic);
    const tools =
      options.tools !== undefined && options.tools.length > 0 && this.deps.toolsAllowed?.(topic) === true
        ? options.tools
        : undefined;
    const result = await this.deps
      .llm()
      .generate(
        { ...request, ...(model === undefined ? {} : { model }), ...(tools === undefined ? {} : { tools }) },
        (token) => options.onToken?.(token),
        signal,
      );

    if (result.toolCall !== undefined && !result.aborted) {
      await this.deps.messages.delete(userMessage.id);
      return {
        userMessage,
        assistantMessage: null,
        interrupted: false,
        newTitle: null,
        titleError: null,
        toolCall: result.toolCall,
      };
    }

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
