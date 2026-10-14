import { CloudHttpClient } from '../CloudHttpClient';
import { META_LLAMA_CONFIG, OpenAiCompatibleEngine } from '../OpenAiCompatibleEngine';
import { recordedServer, sse, type Recording } from './support/recordedServer';

const KEY = 'test-llama-key';

function setup(...recordings: Recording[]) {
  const server = recordedServer(...recordings);
  const engine = new OpenAiCompatibleEngine(
    new CloudHttpClient({ fetch: server.fetch, sleep: async () => {} }),
    async () => KEY,
    META_LLAMA_CONFIG,
  );
  return { engine, calls: server.calls };
}

describe('Meta Llama API adapter', () => {
  it('streams a chat completion from api.llama.com with the default Llama model', async () => {
    const { engine, calls } = setup({
      status: 200,
      chunks: sse(
        { choices: [{ delta: { content: 'Witaj ' } }] },
        { choices: [{ delta: { content: 'w Polsce.' } }] },
        '[DONE]',
      ),
    });
    const tokens: string[] = [];

    const result = await engine.generate(
      { systemPrompt: null, messages: [{ role: 'user', content: 'Cześć' }] },
      (token) => tokens.push(token),
      new AbortController().signal,
    );

    expect(result).toEqual({ text: 'Witaj w Polsce.', aborted: false });
    expect(engine.provider).toBe('meta');
    expect(calls[0]).toMatchObject({
      url: 'https://api.llama.com/compat/v1/chat/completions',
      headers: { authorization: `Bearer ${KEY}` },
      body: {
        model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages: [{ role: 'user', content: 'Cześć' }],
        stream: true,
      },
    });
  });

  it('lists Llama models from the API with the built-in list as a fallback', async () => {
    const listed = setup({
      status: 200,
      chunks: ['{"data":[{"id":"Llama-4-Scout-17B-16E-Instruct-FP8"},{"id":"Llama-3.3-70B-Instruct"}]}'],
    });
    await expect(listed.engine.listModels()).resolves.toEqual([
      'Llama-3.3-70B-Instruct',
      'Llama-4-Scout-17B-16E-Instruct-FP8',
    ]);

    const failing = setup({ status: 403, chunks: [] });
    await expect(failing.engine.listModels()).resolves.toEqual(META_LLAMA_CONFIG.fallbackModels);
  });
});
