import { DomainError } from '../../core/errors';
import type { LlmEntry } from '../../models/catalog';
import type { LlmEngine, LlmRequest, LlmResult } from '../types';
import type { LlamaContextSlot, LlamaMessage } from './LlamaContextSlot';

const TEMPERATURE = 0.7;

export interface LocalModelResolver {
  // The model chosen right now (global setting or topic override) — read on every request.
  currentModel(): LlmEntry;
  // Path of the downloaded GGUF file, or null when it is not on the device.
  modelPath(entry: LlmEntry): Promise<string | null>;
}

function toLlamaMessages(request: LlmRequest): LlamaMessage[] {
  const system: LlamaMessage[] =
    request.systemPrompt === null ? [] : [{ role: 'system', content: request.systemPrompt }];
  return [
    ...system,
    ...request.messages.map((message) => ({ role: message.role, content: message.content })),
  ];
}

// On-device LLM (llama.rn / GGUF); works without network once the model is downloaded.
export class LocalLlmEngine implements LlmEngine {
  constructor(
    private readonly models: LocalModelResolver,
    private readonly slot: LlamaContextSlot,
  ) {}

  async generate(
    request: LlmRequest,
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<LlmResult> {
    const model = this.models.currentModel();
    const path = await this.models.modelPath(model);
    if (path === null) throw new DomainError('model_missing', model.id);
    if (signal.aborted) return { text: '', aborted: true };

    const context = await this.slot.acquire(path, model.contextTokens);
    const stop = () => void context.stopCompletion();
    signal.addEventListener('abort', stop);
    let text = '';
    try {
      const result = await context.completion(
        {
          messages: toLlamaMessages(request),
          n_predict: request.maxTokens ?? model.maxOutputTokens,
          temperature: TEMPERATURE,
        },
        ({ token }) => {
          text += token;
          onToken(token);
        },
      );
      return { text, aborted: signal.aborted || result.interrupted };
    } finally {
      signal.removeEventListener('abort', stop);
    }
  }
}
