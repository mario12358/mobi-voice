import { llmEntries, type LlmEntry } from '../../../models/catalog';
import type { LlmRequest } from '../../types';
import {
  LlamaContextSlot,
  type LlamaCompletionParams,
  type LlamaContextLike,
  type LlamaInitParams,
} from '../LlamaContextSlot';
import { LocalLlmEngine } from '../LocalLlmEngine';

// Stand-in for a llama.rn context: streams the scripted reply token by token and honours stopCompletion.
class FakeLlamaContext implements LlamaContextLike {
  readonly calls: LlamaCompletionParams[] = [];
  released = false;
  private stopped = false;

  constructor(
    readonly params: LlamaInitParams,
    private readonly reply: string[],
    private readonly onTokenHook: (index: number) => void = () => undefined,
  ) {}

  async completion(params: LlamaCompletionParams, onToken: (data: { token: string }) => void) {
    this.calls.push(params);
    this.stopped = false;
    let text = '';
    for (const [index, token] of this.reply.entries()) {
      if (this.stopped) return { text, interrupted: true };
      await Promise.resolve();
      text += token;
      onToken({ token });
      this.onTokenHook(index);
    }
    return { text, interrupted: false };
  }

  async stopCompletion() {
    this.stopped = true;
  }

  async release() {
    this.released = true;
  }
}

function model(id: string): LlmEntry {
  const entry = llmEntries().find((candidate) => candidate.id === id);
  if (entry === undefined) throw new Error(id);
  return entry;
}

const REQUEST: LlmRequest = {
  systemPrompt: 'Odpowiadaj zwięźle po polsku.',
  messages: [
    { role: 'user', content: 'Cześć' },
    { role: 'assistant', content: 'Dzień dobry!' },
    { role: 'user', content: 'Jaka jest stolica Polski?' },
  ],
};

function setup(reply = ['Stolicą ', 'Polski ', 'jest ', 'Warszawa.']) {
  const contexts: FakeLlamaContext[] = [];
  const initLlama = jest.fn(async (params: LlamaInitParams) => {
    const context = new FakeLlamaContext(params, reply);
    contexts.push(context);
    return context;
  });
  let current = model('qwen2.5-1.5b');
  const downloaded = new Set(['qwen2.5-1.5b', 'llama3.2-1b']);
  const engine = new LocalLlmEngine(
    {
      currentModel: (requested?: string) => (requested === undefined ? current : model(requested)),
      modelPath: async (entry) => (downloaded.has(entry.id) ? `/docs/models/${entry.id}/model.gguf` : null),
    },
    new LlamaContextSlot(initLlama, 99),
  );
  return { engine, contexts, initLlama, select: (id: string) => (current = model(id)) };
}

describe('LocalLlmEngine', () => {
  it("loads the topic's own model when the request names one, the global choice otherwise", async () => {
    const { engine, initLlama } = setup();

    await engine.generate(
      { ...REQUEST, model: 'llama3.2-1b' },
      () => undefined,
      new AbortController().signal,
    );
    expect(initLlama).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: '/docs/models/llama3.2-1b/model.gguf' }),
    );

    await engine.generate(REQUEST, () => undefined, new AbortController().signal);
    expect(initLlama).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: '/docs/models/qwen2.5-1.5b/model.gguf' }),
    );
  });

  // specky: crit 01M4TPSCNMGEE6WVQX15T9B7CV
  it('chats with the downloaded model from the device file, without any network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { engine, initLlama } = setup();
    const tokens: string[] = [];

    const result = await engine.generate(
      REQUEST,
      (token) => tokens.push(token),
      new AbortController().signal,
    );

    expect(tokens).toEqual(['Stolicą ', 'Polski ', 'jest ', 'Warszawa.']);
    expect(result).toEqual({ text: 'Stolicą Polski jest Warszawa.', aborted: false });
    expect(initLlama).toHaveBeenCalledWith({
      model: '/docs/models/qwen2.5-1.5b/model.gguf',
      n_ctx: 4_096,
      n_gpu_layers: 99,
      use_mlock: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('sends the system prompt and the conversation as chat messages with the output limit', async () => {
    const { engine, contexts } = setup();

    await engine.generate({ ...REQUEST, maxTokens: 64 }, () => undefined, new AbortController().signal);

    expect(contexts[0]?.calls[0]).toEqual({
      messages: [
        { role: 'system', content: 'Odpowiadaj zwięźle po polsku.' },
        { role: 'user', content: 'Cześć' },
        { role: 'assistant', content: 'Dzień dobry!' },
        { role: 'user', content: 'Jaka jest stolica Polski?' },
      ],
      n_predict: 64,
      temperature: 0.7,
    });
  });

  it('abort stops generation and returns the text produced so far', async () => {
    const { engine } = setup();
    const controller = new AbortController();
    const tokens: string[] = [];

    const result = await engine.generate(
      REQUEST,
      (token) => {
        tokens.push(token);
        if (tokens.length === 2) controller.abort();
      },
      controller.signal,
    );

    expect(result).toEqual({ text: 'Stolicą Polski ', aborted: true });
  });

  it('keeps one model in memory and releases it when the user switches models', async () => {
    const { engine, contexts, initLlama, select } = setup();
    const signal = new AbortController().signal;

    await engine.generate(REQUEST, () => undefined, signal);
    await engine.generate(REQUEST, () => undefined, signal);
    expect(initLlama).toHaveBeenCalledTimes(1);

    select('llama3.2-1b');
    await engine.generate(REQUEST, () => undefined, signal);

    expect(initLlama).toHaveBeenCalledTimes(2);
    expect(contexts[0]?.released).toBe(true);
    expect(contexts[1]?.params.model).toBe('/docs/models/llama3.2-1b/model.gguf');
  });

  it('reports a missing model instead of loading anything', async () => {
    const { engine, initLlama, select } = setup();
    select('gemma2-2b');

    await expect(
      engine.generate(REQUEST, () => undefined, new AbortController().signal),
    ).rejects.toMatchObject({
      code: 'model_missing',
    });
    expect(initLlama).not.toHaveBeenCalled();
  });

  it('does not start when the request was already cancelled', async () => {
    const { engine, initLlama } = setup();
    const controller = new AbortController();
    controller.abort();

    expect(await engine.generate(REQUEST, () => undefined, controller.signal)).toEqual({
      text: '',
      aborted: true,
    });
    expect(initLlama).not.toHaveBeenCalled();
  });
});
