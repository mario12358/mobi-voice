import { DomainError } from '../core/errors';
import { parseToolArguments, type LlmRequest, type LlmResult } from '../engines/types';
import type { CloudHttpClient } from './CloudHttpClient';
import type { ApiKeySource, CloudLlmEngine } from './types';

const BASE_URL = 'https://api.anthropic.com/v1';
const API_VERSION = '2023-06-01';
// Messages API requires an output limit; voice answers are short anyway.
const DEFAULT_MAX_TOKENS = 1_024;

export const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-5-5';
export const ANTHROPIC_FALLBACK_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'];

interface StreamEvent {
  type?: string;
  index?: number;
  content_block?: { type?: string; name?: string };
  delta?: { type?: string; text?: string; partial_json?: string };
}

function parseEvent(data: string): StreamEvent | null {
  try {
    return JSON.parse(data) as StreamEvent;
  } catch {
    return null;
  }
}

// Anthropic Messages API, streamed (MV-CLOUD-1); the system prompt goes in its own field.
export class AnthropicEngine implements CloudLlmEngine {
  readonly provider = 'anthropic' as const;

  constructor(
    private readonly client: CloudHttpClient,
    private readonly apiKey: ApiKeySource,
  ) {}

  async generate(
    request: LlmRequest,
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<LlmResult> {
    const key = await this.requireKey();
    let text = '';
    // The first tool_use block: its name at the start, its input as streamed JSON pieces.
    const tool = { index: -1, name: '', args: '' };
    try {
      const response = await this.client.request({
        url: `${BASE_URL}/messages`,
        headers: this.headers(key),
        body: {
          model: request.model ?? ANTHROPIC_DEFAULT_MODEL,
          max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(request.systemPrompt === null ? {} : { system: request.systemPrompt }),
          messages: request.messages.map(({ role, content }) => ({ role, content })),
          stream: true,
          ...(request.tools === undefined || request.tools.length === 0
            ? {}
            : {
                tools: request.tools.map(({ name, description, parameters }) => ({
                  name,
                  description,
                  input_schema: parameters,
                })),
              }),
        },
        signal,
      });
      await this.client.readEvents(response, (event) => {
        const parsed = parseEvent(event.data);
        if (signal.aborted || parsed === null) return;
        if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
          if (tool.index === -1)
            Object.assign(tool, { index: parsed.index ?? 0, name: parsed.content_block.name ?? '' });
          return;
        }
        if (parsed.type !== 'content_block_delta') return;
        if (parsed.delta?.type === 'input_json_delta' && parsed.index === tool.index) {
          tool.args += parsed.delta.partial_json ?? '';
          return;
        }
        if (parsed.delta?.type !== 'text_delta') return;
        const token = parsed.delta.text ?? '';
        if (token.length === 0) return;
        text += token;
        onToken(token);
      });
      const toolCall =
        tool.name === '' ? {} : { toolCall: { name: tool.name, arguments: parseToolArguments(tool.args) } };
      return { text, aborted: signal.aborted, ...toolCall };
    } catch (error) {
      if (signal.aborted) return { text, aborted: true };
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.request({
        url: `${BASE_URL}/models`,
        method: 'GET',
        headers: this.headers(await this.requireKey()),
      });
      const { data } = JSON.parse(await response.text()) as { data?: { id: string }[] };
      const ids = (data ?? []).map((model) => model.id).filter((id) => id.startsWith('claude-'));
      return ids.length > 0 ? ids.sort() : ANTHROPIC_FALLBACK_MODELS;
    } catch {
      return ANTHROPIC_FALLBACK_MODELS;
    }
  }

  async validateKey(apiKey: string): Promise<void> {
    await this.client.request({ url: `${BASE_URL}/models`, method: 'GET', headers: this.headers(apiKey) });
  }

  private headers(key: string): Record<string, string> {
    return { 'x-api-key': key, 'anthropic-version': API_VERSION };
  }

  private async requireKey(): Promise<string> {
    const key = await this.apiKey();
    if (key === null) throw new DomainError('invalid_api_key', 'anthropic: no key');
    return key;
  }
}
