import { DomainError } from '../core/errors';
import { parseToolArguments, type LlmRequest, type LlmResult, type ToolDefinition } from '../engines/types';
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

interface ToolCallDelta {
  index?: number;
  function?: { name?: string; arguments?: string };
}

interface ChatChunk {
  choices?: { delta?: { content?: string | null; tool_calls?: ToolCallDelta[] } }[];
}

function toTools(tools: ToolDefinition[]) {
  return tools.map(({ name, description, parameters }) => ({
    type: 'function',
    function: { name, description, parameters },
  }));
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
    // The first tool call, streamed as its name and then its arguments in pieces.
    const tool = { name: '', args: '' };
    try {
      const response = await this.client.request({
        url: `${this.config.baseUrl}/chat/completions`,
        headers: { authorization: `Bearer ${key}` },
        body: {
          model: request.model ?? this.config.defaultModel,
          messages: toMessages(request),
          stream: true,
          ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
          ...(request.tools === undefined || request.tools.length === 0
            ? {}
            : { tools: toTools(request.tools) }),
        },
        signal,
      });
      await this.client.readEvents(response, (event) => {
        if (event.data === '[DONE]' || signal.aborted) return;
        const delta = parseChunk(event.data)?.choices?.[0]?.delta;
        for (const call of delta?.tool_calls ?? []) {
          if ((call.index ?? 0) !== 0) continue;
          tool.name += call.function?.name ?? '';
          tool.args += call.function?.arguments ?? '';
        }
        const token = delta?.content;
        if (typeof token === 'string' && token.length > 0) {
          text += token;
          onToken(token);
        }
      });
      const toolCall =
        tool.name === '' ? {} : { toolCall: { name: tool.name, arguments: parseToolArguments(tool.args) } };
      return { text, aborted: signal.aborted, ...toolCall };
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

// Meta's Llama API ("Facebook" in the spec) through its OpenAI-compatible endpoint.
export const META_LLAMA_CONFIG: OpenAiCompatibleConfig = {
  provider: 'meta',
  baseUrl: 'https://api.llama.com/compat/v1',
  defaultModel: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
  fallbackModels: [
    'Llama-3.3-70B-Instruct',
    'Llama-3.3-8B-Instruct',
    'Llama-4-Maverick-17B-128E-Instruct-FP8',
    'Llama-4-Scout-17B-16E-Instruct-FP8',
  ],
  isChatModel: (id) => /^(llama|Llama)/.test(id),
};
