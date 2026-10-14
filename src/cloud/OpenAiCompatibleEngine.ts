import { DomainError } from '../core/errors';
import type { LlmRequest, LlmResult } from '../engines/types';
import type { CloudProvider } from '../state/SecretStore';
import type { CloudHttpClient } from './CloudHttpClient';
import type { ApiKeySource, CloudLlmEngine } from './types';

export interface OpenAiCompatibleConfig {
  provider: CloudProvider;
  // Up to and including the version, e.g. https://api.openai.com/v1
  baseUrl: string;
  defaultModel: string;
  fallbackModels: string[];
  // Which of the listed models are chat models worth offering.
  isChatModel?: (id: string) => boolean;
}

interface ChatChunk {
  choices?: { delta?: { content?: string | null } }[];
}

// A malformed event is skipped rather than ending an answer that is otherwise streaming fine.
function parseChunk(data: string): ChatChunk | null {
  try {
    return JSON.parse(data) as ChatChunk;
  } catch {
    return null;
  }
}

function toMessages(request: LlmRequest) {
  const system = request.systemPrompt === null ? [] : [{ role: 'system', content: request.systemPrompt }];
  return [...system, ...request.messages.map(({ role, content }) => ({ role, content }))];
}

// OpenAI chat completions, streamed (MV-CLOUD-1). Meta's Llama API speaks the same protocol.
export class OpenAiCompatibleEngine implements CloudLlmEngine {
  readonly provider: CloudProvider;

  constructor(
    private readonly client: CloudHttpClient,
    private readonly apiKey: ApiKeySource,
    private readonly config: OpenAiCompatibleConfig,
  ) {
    this.provider = config.provider;
  }

  async generate(
    request: LlmRequest,
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<LlmResult> {
    const key = await this.requireKey();
    let text = '';
    try {
      const response = await this.client.request({
        url: `${this.config.baseUrl}/chat/completions`,
        headers: { authorization: `Bearer ${key}` },
        body: {
          model: request.model ?? this.config.defaultModel,
          messages: toMessages(request),
          stream: true,
          ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
        },
        signal,
      });
      await this.client.readEvents(response, (event) => {
        if (event.data === '[DONE]' || signal.aborted) return;
        const token = parseChunk(event.data)?.choices?.[0]?.delta?.content;
        if (typeof token === 'string' && token.length > 0) {
          text += token;
          onToken(token);
        }
      });
      return { text, aborted: signal.aborted };
    } catch (error) {
      // STOP while the answer streams: what arrived so far is the answer.
      if (signal.aborted) return { text, aborted: true };
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const key = await this.requireKey();
      const response = await this.client.request({
        url: `${this.config.baseUrl}/models`,
        method: 'GET',
        headers: { authorization: `Bearer ${key}` },
      });
      const { data } = JSON.parse(await response.text()) as { data?: { id: string }[] };
      const ids = (data ?? []).map((model) => model.id).filter(this.config.isChatModel ?? (() => true));
      return ids.length > 0 ? ids.sort() : this.config.fallbackModels;
    } catch {
      return this.config.fallbackModels;
    }
  }

  async validateKey(apiKey: string): Promise<void> {
    await this.client.request({
      url: `${this.config.baseUrl}/models`,
      method: 'GET',
      headers: { authorization: `Bearer ${apiKey}` },
    });
  }

  private async requireKey(): Promise<string> {
    const key = await this.apiKey();
    if (key === null) throw new DomainError('invalid_api_key', `${this.provider}: no key`);
    return key;
  }
}

export function isOpenAiChatModel(id: string): boolean {
  return (
    /^(gpt-|o\d|chatgpt-)/.test(id) && !/(audio|realtime|transcribe|tts|image|search|embedding)/.test(id)
  );
}

export const OPENAI_CONFIG: OpenAiCompatibleConfig = {
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o-mini',
  fallbackModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'],
  isChatModel: isOpenAiChatModel,
};
