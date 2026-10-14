import {
  CloudHttpClient,
  MAX_RETRIES,
  REQUEST_TIMEOUT_MS,
  type FetchLike,
  type HttpResponse,
} from '../CloudHttpClient';

const URL_OPENAI = 'https://api.openai.com/v1/chat/completions';
const SECRET_KEY = 'test-key-123456';

function response(status: number, body = ''): HttpResponse {
  return { status, text: async () => body };
}

function setup(...outcomes: (number | Error)[]) {
  const calls: { url: string; init: Parameters<FetchLike>[1] }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    const outcome = outcomes.shift() ?? 200;
    if (outcome instanceof Error) throw outcome;
    return response(outcome, '{"ok":true}');
  };
  const sleeps: number[] = [];
  const logs: string[] = [];
  const client = new CloudHttpClient({
    fetch,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
    },
    log: (line) => logs.push(line),
  });
  return { client, calls, sleeps, logs };
}

const REQUEST = {
  url: URL_OPENAI,
  headers: { authorization: `Bearer ${SECRET_KEY}` },
  body: { messages: [{ role: 'user', content: 'Moje prywatne pytanie' }] },
};

describe('CloudHttpClient', () => {
  it('sends JSON and returns the successful response', async () => {
    const { client, calls } = setup(200);

    const result = await client.request(REQUEST);

    expect(result.status).toBe(200);
    expect(calls[0]?.init).toMatchObject({
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET_KEY}` },
      body: JSON.stringify(REQUEST.body),
    });
  });

  // specky: crit 01M4TPSD6AM5PRHDF9YP515MSQ
  it('reports 401 as an invalid API key, in Polish, without retrying', async () => {
    const { client, calls } = setup(401);

    await expect(client.request(REQUEST)).rejects.toMatchObject({
      code: 'invalid_api_key',
      userMessage: 'Nieprawidłowy klucz API',
    });
    expect(calls).toHaveLength(1);
  });

  // specky: crit 01M4TPSD6AE4BW0DRNTTNKD58N
  it('reports 429 as an exceeded limit, in Polish, without retrying', async () => {
    const { client, calls } = setup(429);

    await expect(client.request(REQUEST)).rejects.toMatchObject({
      code: 'rate_limited',
      userMessage: 'Przekroczony limit',
    });
    expect(calls).toHaveLength(1);
  });

  it('retries 5xx twice with growing backoff, then reports a provider error', async () => {
    const { client, calls, sleeps } = setup(503, 500, 502);

    await expect(client.request(REQUEST)).rejects.toMatchObject({ code: 'provider_error' });
    expect(calls).toHaveLength(1 + MAX_RETRIES);
    expect(sleeps).toEqual([500, 1_000]);
  });

  it('recovers when a retry succeeds', async () => {
    const { client, calls } = setup(500, new TypeError('Network request failed'), 200);

    await expect(client.request(REQUEST)).resolves.toMatchObject({ status: 200 });
    expect(calls).toHaveLength(3);
  });

  it('reports a network failure after the retries as no connection', async () => {
    const failure = new TypeError('Network request failed');
    const { client, calls } = setup(failure, failure, failure);

    await expect(client.request(REQUEST)).rejects.toMatchObject({ code: 'network_unavailable' });
    expect(calls).toHaveLength(3);
  });

  it('gives up on a request after 60 s and retries it', async () => {
    jest.useFakeTimers();
    try {
      let aborted = 0;
      const fetch: FetchLike = (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener('abort', () => {
            aborted += 1;
            reject(new Error('aborted by timeout'));
          }),
        );
      const client = new CloudHttpClient({ fetch, sleep: async () => {} });

      const result = client.request(REQUEST).catch((error: unknown) => error);
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      }

      expect(await result).toMatchObject({ code: 'network_unavailable' });
      expect(aborted).toBe(1 + MAX_RETRIES);
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops at once when the conversation is stopped, without retrying', async () => {
    const controller = new AbortController();
    const fetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) =>
        init.signal.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    const client = new CloudHttpClient({ fetch, sleep: async () => {} });

    const result = client.request({ ...REQUEST, signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toMatchObject({ message: 'aborted' });
  });

  it('refuses hosts outside the provider list', async () => {
    const { client, calls } = setup(200);

    await expect(client.request({ ...REQUEST, url: 'https://example.com/v1/chat' })).rejects.toMatchObject({
      code: 'host_not_allowed',
    });
    expect(calls).toHaveLength(0);
  });

  // specky: crit 01M4TPSDFMFSQRK8VYVJPNVEKR
  it('logs only method, host and status — never the API key or the conversation', async () => {
    const { client, logs } = setup(500, 200);

    await client.request(REQUEST);

    expect(logs).toEqual(['POST api.openai.com → 500', 'POST api.openai.com → 200']);
    expect(logs.join('\n')).not.toContain(SECRET_KEY);
    expect(logs.join('\n')).not.toContain('prywatne');
  });

  it('reads a streamed body event by event across chunk boundaries', async () => {
    const { client } = setup();
    const chunks = ['data: {"a":', '1}\n\nda', 'ta: {"a":2}\n\n', 'data: [DONE]\n\n'];
    const encoder = new TextEncoder();
    const streamed: HttpResponse = {
      status: 200,
      text: async () => '',
      body: {
        getReader: () => ({
          read: async () => {
            const next = chunks.shift();
            return next === undefined ? { done: true } : { done: false, value: encoder.encode(next) };
          },
        }),
      },
    };
    const data: string[] = [];

    await client.readEvents(streamed, (event) => data.push(event.data));

    expect(data).toEqual(['{"a":1}', '{"a":2}', '[DONE]']);
  });
});
