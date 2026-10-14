import { CloudHttpClient } from '../CloudHttpClient';
import { GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODELS, GeminiEngine } from '../GeminiEngine';
import { recordedServer, sse, type Recording } from './support/recordedServer';

const KEY = 'test-gemini-key';
const REQUEST = {
  systemPrompt: 'Odpowiadaj krótko.',
  messages: [
    { role: 'user' as const, content: 'Cześć' },
    { role: 'assistant' as const, content: 'Dzień dobry!' },
    { role: 'user' as const, content: 'Gdzie jechać?' },
  ],
  maxTokens: 300,
};

function part(text: string) {
  return { candidates: [{ content: { role: 'model', parts: [{ text }] } }] };
}

function setup(...recordings: Recording[]) {
  const server = recordedServer(...recordings);
  const engine = new GeminiEngine(
    new CloudHttpClient({ fetch: server.fetch, sleep: async () => {} }),
    async () => KEY,
  );
  return { engine, calls: server.calls };
}

describe('Gemini adapter', () => {
  it('streams generateContent, mapping assistant turns to "model" and the system prompt to systemInstruction', async () => {
    const { engine, calls } = setup({ status: 200, chunks: sse(part('Na '), part('Mazury.')) });
    const tokens: string[] = [];

    const result = await engine.generate(
      REQUEST,
      (token) => tokens.push(token),
      new AbortController().signal,
    );

    expect(result).toEqual({ text: 'Na Mazury.', aborted: false });
    expect(tokens).toEqual(['Na ', 'Mazury.']);
    expect(calls[0]).toEqual({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_DEFAULT_MODEL}:streamGenerateContent?alt=sse`,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: {
        systemInstruction: { parts: [{ text: 'Odpowiadaj krótko.' }] },
        contents: [
          { role: 'user', parts: [{ text: 'Cześć' }] },
          { role: 'model', parts: [{ text: 'Dzień dobry!' }] },
          { role: 'user', parts: [{ text: 'Gdzie jechać?' }] },
        ],
        generationConfig: { maxOutputTokens: 300 },
      },
    });
  });

  it('keeps what arrived when the answer is stopped mid-stream', async () => {
    const { engine } = setup({ status: 200, chunks: sse(part('Mazury '), part('są '), part('piękne.')) });
    const controller = new AbortController();

    const result = await engine.generate(
      REQUEST,
      (token) => token === 'są ' && controller.abort(),
      controller.signal,
    );

    expect(result).toEqual({ text: 'Mazury są ', aborted: true });
  });

  it('lists Gemini chat models from the API with the built-in list as a fallback', async () => {
    const listed = setup({
      status: 200,
      chunks: [
        JSON.stringify({
          models: [
            { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
            {
              name: 'models/gemini-2.5-flash',
              supportedGenerationMethods: ['generateContent', 'countTokens'],
            },
          ],
        }),
      ],
    });
    await expect(listed.engine.listModels()).resolves.toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);

    const failing = setup({ status: 400, chunks: [] });
    await expect(failing.engine.listModels()).resolves.toEqual(GEMINI_FALLBACK_MODELS);
  });

  it('treats the 400 Google returns for a wrong key as an invalid key', async () => {
    const { engine } = setup({
      status: 400,
      chunks: ['{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'],
    });

    await expect(engine.validateKey('wrong')).rejects.toMatchObject({
      userMessage: 'Nieprawidłowy klucz API',
    });
  });

  it('reports an exceeded quota in Polish', async () => {
    const { engine } = setup({ status: 429, chunks: ['{"error":{"code":429}}'] });

    await expect(
      engine.generate(REQUEST, () => undefined, new AbortController().signal),
    ).rejects.toMatchObject({
      userMessage: 'Przekroczony limit',
    });
  });
});
