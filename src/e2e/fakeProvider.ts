import type { FetchLike, HttpResponse } from '../cloud/CloudHttpClient';
import { MemoryApiKeys } from './MemoryApiKeys';

// e2e builds only: a pretend OpenAI so Detox can add a key and talk to a cloud model without the internet.
export const e2eApiKeys = new MemoryApiKeys();

export const E2E_VALID_KEY = 'e2e-poprawny-klucz';
export const E2E_CLOUD_MODEL = 'gpt-4o-mini';
// A question with this word fails as a lost connection, to show the error message.
export const E2E_NETWORK_FAILURE_TRIGGER = 'sieć';

export function e2eCloudAnswer(question: string): string {
  return `Chmura odpowiada na: ${question}. To jest drugie zdanie.`;
}

function json(status: number, body: unknown): HttpResponse {
  return { status, text: async () => JSON.stringify(body), body: null };
}

function stream(tokens: string[]): HttpResponse {
  const encoder = new TextEncoder();
  const chunks = [
    ...tokens.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`),
    'data: [DONE]\n\n',
  ];
  return {
    status: 200,
    text: async () => chunks.join(''),
    body: {
      getReader: () => ({
        read: async () => {
          const next = chunks.shift();
          return next === undefined ? { done: true } : { done: false, value: encoder.encode(next) };
        },
      }),
    },
  };
}

export const e2eProviderFetch: FetchLike = async (url, init) => {
  if (!url.startsWith('https://api.openai.com/'))
    return json(401, { error: 'e2e: only OpenAI is pretended' });
  if (init.headers.authorization !== `Bearer ${E2E_VALID_KEY}`) return json(401, { error: 'invalid key' });
  if (url.endsWith('/models')) return json(200, { data: [{ id: E2E_CLOUD_MODEL }, { id: 'gpt-4o' }] });

  const request = JSON.parse(init.body ?? '{}') as { messages?: { role: string; content: string }[] };
  const question = request.messages?.filter((message) => message.role === 'user').at(-1)?.content ?? '';
  if (question.includes(E2E_NETWORK_FAILURE_TRIGGER)) throw new TypeError('Network request failed');
  return stream(e2eCloudAnswer(question).match(/\S+\s*/g) ?? []);
};
