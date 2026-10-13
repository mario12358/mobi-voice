import { useCallback, useEffect, useRef, useState } from 'react';

import { DomainError, isDomainError } from '../../core/errors';
import type { Message } from '../../db/repositories/MessageRepository';
import type { Topic } from '../../db/repositories/TopicRepository';
import { useServices } from '../../services/ServicesProvider';

export interface ConversationState {
  topic: Topic | null;
  messages: Message[];
  // Text of the answer being generated right now, or null when the model is idle.
  streaming: string | null;
  error: DomainError | null;
  send(text: string): Promise<void>;
  stop(): void;
  setTopicPrompt(prompt: string): Promise<void>;
}

function toDomainError(error: unknown): DomainError {
  return isDomainError(error) ? error : new DomainError('provider_error', undefined, { cause: error });
}

export function useConversation(topicId: number): ConversationState {
  const services = useServices();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<DomainError | null>(null);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(
    () => Promise.all([services.topics.getById(topicId), services.messages.listByTopic(topicId)]),
    [services, topicId],
  );

  const reload = useCallback(async () => {
    const [loadedTopic, loadedMessages] = await load();
    setTopic(loadedTopic);
    setMessages(loadedMessages);
  }, [load]);

  useEffect(() => {
    let active = true;
    load().then(([loadedTopic, loadedMessages]) => {
      if (!active) return;
      setTopic(loadedTopic);
      setMessages(loadedMessages);
    });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [load]);

  const send = useCallback(
    async (text: string) => {
      if (text.trim().length === 0 || abort.current !== null) return;
      const controller = new AbortController();
      abort.current = controller;
      setError(null);
      setStreaming('');
      try {
        await services.conversation.send(topicId, text, {
          signal: controller.signal,
          onToken: (token) => setStreaming((current) => (current ?? '') + token),
        });
      } catch (failure) {
        setError(toDomainError(failure));
      } finally {
        abort.current = null;
        setStreaming(null);
        await reload();
      }
    },
    [reload, services, topicId],
  );

  const stop = useCallback(() => abort.current?.abort(), []);

  const setTopicPrompt = useCallback(
    async (prompt: string) => {
      setTopic(await services.topics.setSystemPrompt(topicId, prompt));
    },
    [services, topicId],
  );

  return { topic, messages, streaming, error, send, stop, setTopicPrompt };
}
