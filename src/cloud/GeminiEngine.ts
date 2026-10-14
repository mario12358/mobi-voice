import { DomainError, isDomainError } from '../core/errors';
import type { LlmRequest, LlmResult, ToolCall } from '../engines/types';
import type { CloudHttpClient } from './CloudHttpClient';
import type { ApiKeySource, CloudLlmEngine } from './types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'];

interface StreamChunk {
  candidates?: {
    content?: {
      parts?: { text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }[];
    };
  }[];
}

interface ListedModel {
  name: string;
  supportedGenerationMethods?: string[];
}

function parseChunk(data: string): StreamChunk | null {
  try {
    return JSON.parse(data) as StreamChunk;
  } catch {
    return null;
  }
}

// Google Gemini generateContent, streamed as SSE (MV-CLOUD-1); the assistant's turns are "model" turns.
export class GeminiEngine implements CloudLlmEngine {
  readonly provider = 'google' as const;

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
    const model = request.model ?? GEMINI_DEFAULT_MODEL;
    let text = '';
    // Gemini sends a function call whole, in one part.
    let toolCall: ToolCall | undefined;
    try {
      const response = await this.client.request({
        url: `${BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
        headers: { 'x-goog-api-key': key },
        body: {
          ...(request.systemPrompt === null
            ? {}
            : { systemInstruction: { parts: [{ text: request.systemPrompt }] } }),
          contents: request.messages.map(({ role, content }) => ({
            role: role === 'assistant' ? 'model' : 'user',
            parts: [{ text: content }],
          })),
          ...(request.maxTokens === undefined
            ? {}
            : { generationConfig: { maxOutputTokens: request.maxTokens } }),
          ...(request.tools === undefined || request.tools.length === 0
            ? {}
            : { tools: [{ functionDeclarations: request.tools }] }),
        },
        signal,
      });
      await this.client.readEvents(response, (event) => {
        if (signal.aborted) return;
        const parts = parseChunk(event.data)?.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.functionCall?.name !== undefined && toolCall === undefined) {
            toolCall = { name: part.functionCall.name, arguments: part.functionCall.args ?? {} };
          }
          if (typeof part.text !== 'string' || part.text.length === 0) continue;
          text += part.text;
          onToken(part.text);
        }
      });
      return { text, aborted: signal.aborted, ...(toolCall === undefined ? {} : { toolCall }) };
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
        headers: { 'x-goog-api-key': await this.requireKey() },
      });
      const { models } = JSON.parse(await response.text()) as { models?: ListedModel[] };
      const ids = (models ?? [])
        .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model) => model.name.replace(/^models\//, ''))
        .filter((id) => id.startsWith('gemini-') && !/(embedding|image|tts|audio|live)/.test(id));
      return ids.length > 0 ? ids.sort() : GEMINI_FALLBACK_MODELS;
    } catch {
      return GEMINI_FALLBACK_MODELS;
    }
  }

  // Google answers a wrong key with 400 API_KEY_INVALID, not 401; a model list request has nothing else to get wrong.
  async validateKey(apiKey: string): Promise<void> {
    try {
      await this.client.request({
        url: `${BASE_URL}/models`,
        method: 'GET',
        headers: { 'x-goog-api-key': apiKey },
      });
    } catch (error) {
      if (isDomainError(error) && error.code === 'provider_error' && error.message === 'HTTP 400') {
        throw new DomainError('invalid_api_key', 'google: HTTP 400', { cause: error });
      }
      throw error;
    }
  }

  private async requireKey(): Promise<string> {
    const key = await this.apiKey();
    if (key === null) throw new DomainError('invalid_api_key', 'google: no key');
    return key;
  }
}
