import { CloudHttpClient } from '../CloudHttpClient';
import { OPENAI_CONFIG, OpenAiCompatibleEngine } from '../OpenAiCompatibleEngine';
import { TOPIC_TOOLS } from '../../services/voice/topicTools';
import { recordedServer, sse, type Recording } from './support/recordedServer';

const KEY = 'test-openai-key';
const REQUEST = {
  systemPrompt: 'Odpowiadaj krótko.',
  messages: [
    { role: 'user' as const, content: 'Cześć' },
    { role: 'assistant' as const, content: 'Dzień dobry!' },
    { role: 'user' as const, content: 'Gdzie jechać?' },
  ],
  maxTokens: 256,
};

function delta(content: string) {
  return { choices: [{ delta: { content } }] };
}

function setup(...recordings: Recording[]) {
  const server = recordedServer(...recordings);
  const engine = new OpenAiCompatibleEngine(
    new CloudHttpClient({ fetch: server.fetch, sleep: async () => {} }),
    async () => KEY,
    OPENAI_CONFIG,
  );
  return { engine, calls: server.calls };
}

describe('OpenAI adapter', () => {
  it('streams a chat completion with the system prompt and the history', async () => {
    const { engine, calls } = setup({
      status: 200,
      chunks: sse({ choices: [{ delta: { role: 'assistant' } }] }, delta('Na '), delta('Mazury.'), '[DONE]'),
    });
    const tokens: string[] = [];

    const result = await engine.generate(
      { ...REQUEST, model: 'gpt-4o' },
      (token) => tokens.push(token),
      new AbortController().signal,
    );

    expect(tokens).toEqual(['Na ', 'Mazury.']);
    expect(result).toEqual({ text: 'Na Mazury.', aborted: false });
    expect(calls[0]).toEqual({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: {
        model: 'gpt-4o',
        stream: true,
        max_tokens: 256,
        messages: [
          { role: 'system', content: 'Odpowiadaj krótko.' },
          { role: 'user', content: 'Cześć' },
          { role: 'assistant', content: 'Dzień dobry!' },
          { role: 'user', content: 'Gdzie jechać?' },
        ],
      },
    });
  });

  it('offers the tools and returns the function the model called, its arguments streamed in pieces', async () => {
    const call = (fn: { name?: string; arguments: string }) => ({
      choices: [{ delta: { tool_calls: [{ index: 0, function: fn }] } }],
    });
    const { engine, calls } = setup({
      status: 200,
      chunks: sse(
        call({ name: 'switch_topic', arguments: '' }),
        call({ arguments: '{"name":' }),
        call({ arguments: '"wakacje"}' }),
        '[DONE]',
      ),
    });

    const result = await engine.generate(
      { ...REQUEST, tools: TOPIC_TOOLS },
      () => {},
      new AbortController().signal,
    );

    expect(result).toEqual({
      text: '',
      aborted: false,
      toolCall: { name: 'switch_topic', arguments: { name: 'wakacje' } },
    });
    expect((calls[0]!.body as { tools: unknown[] }).tools).toEqual(
      TOPIC_TOOLS.map(({ name, description, parameters }) => ({
        type: 'function',
        function: { name, description, parameters },
      })),
    );
  });

  it('uses the default model when the request names none', async () => {
    const { engine, calls } = setup({ status: 200, chunks: sse(delta('Ok'), '[DONE]') });

    await engine.generate(REQUEST, () => undefined, new AbortController().signal);

    expect((calls[0]?.body as { model: string }).model).toBe('gpt-4o-mini');
  });

  it('keeps what arrived when the answer is stopped mid-stream', async () => {
    const { engine } = setup({ status: 200, chunks: sse(delta('Mazury '), delta('są '), delta('piękne.')) });
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

    expect(result).toEqual({ text: 'Mazury są ', aborted: true });
  });

  it('turns a refused key into the Polish invalid-key message', async () => {
    const { engine } = setup({ status: 401, chunks: ['{"error":{"message":"Incorrect API key"}}'] });

    await expect(
      engine.generate(REQUEST, () => undefined, new AbortController().signal),
    ).rejects.toMatchObject({
      userMessage: 'Nieprawidłowy klucz API',
    });
  });

  // specky: crit 01M4TPSD3NCRZBYB6MHAVGWTCR
  it("lists the provider's chat models from its API and falls back to the built-in list", async () => {
    const listed = setup({
      status: 200,
      chunks: [
        JSON.stringify({
          data: [
            { id: 'gpt-4o' },
            { id: 'text-embedding-3-small' },
            { id: 'gpt-4o-mini' },
            { id: 'whisper-1' },
          ],
        }),
      ],
    });
    await expect(listed.engine.listModels()).resolves.toEqual(['gpt-4o', 'gpt-4o-mini']);
    expect(listed.calls[0]).toMatchObject({ url: 'https://api.openai.com/v1/models', method: 'GET' });

    const failing = setup(
      { status: 503, chunks: [] },
      { status: 503, chunks: [] },
      { status: 503, chunks: [] },
    );
    await expect(failing.engine.listModels()).resolves.toEqual(OPENAI_CONFIG.fallbackModels);
  });

  it('validates a key with a test request', async () => {
    const good = setup({ status: 200, chunks: ['{"data":[]}'] });
    await expect(good.engine.validateKey('new-key')).resolves.toBeUndefined();
    expect(good.calls[0]?.headers.authorization).toBe('Bearer new-key');

    const bad = setup({ status: 401, chunks: [] });
    await expect(bad.engine.validateKey('wrong-key')).rejects.toMatchObject({ code: 'invalid_api_key' });
  });
});
