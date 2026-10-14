import { ANTHROPIC_DEFAULT_MODEL, ANTHROPIC_FALLBACK_MODELS, AnthropicEngine } from '../AnthropicEngine';
import { CloudHttpClient } from '../CloudHttpClient';
import { TOPIC_TOOLS } from '../../services/voice/topicTools';
import { recordedServer, type Recording } from './support/recordedServer';

const KEY = 'test-anthropic-key';
const REQUEST = {
  systemPrompt: 'Odpowiadaj krótko.',
  messages: [
    { role: 'user' as const, content: 'Cześć' },
    { role: 'assistant' as const, content: 'Dzień dobry!' },
    { role: 'user' as const, content: 'Gdzie jechać?' },
  ],
};

// Recorded Messages API stream: named events with JSON data.
function stream(...texts: string[]): string[] {
  const events = [
    ['message_start', { type: 'message_start', message: { id: 'msg_1' } }],
    [
      'content_block_start',
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ],
    ['ping', { type: 'ping' }],
    ...texts.map((text) => [
      'content_block_delta',
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    ]),
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_stop', { type: 'message_stop' }],
  ] as const;
  return events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function setup(...recordings: Recording[]) {
  const server = recordedServer(...recordings);
  const engine = new AnthropicEngine(
    new CloudHttpClient({ fetch: server.fetch, sleep: async () => {} }),
    async () => KEY,
  );
  return { engine, calls: server.calls };
}

describe('Anthropic adapter', () => {
  it('streams a Messages API answer with the system prompt in its own field', async () => {
    const { engine, calls } = setup({ status: 200, chunks: stream('Na ', 'Mazury.') });
    const tokens: string[] = [];

    const result = await engine.generate(
      REQUEST,
      (token) => tokens.push(token),
      new AbortController().signal,
    );

    expect(tokens).toEqual(['Na ', 'Mazury.']);
    expect(result).toEqual({ text: 'Na Mazury.', aborted: false });
    expect(calls[0]).toEqual({
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: {
        model: ANTHROPIC_DEFAULT_MODEL,
        max_tokens: 1_024,
        system: 'Odpowiadaj krótko.',
        messages: REQUEST.messages,
        stream: true,
      },
    });
  });

  it('offers the tools and returns the tool_use block, its input streamed as JSON pieces', async () => {
    const event = (name: string, data: object) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
    const { engine, calls } = setup({
      status: 200,
      chunks: [
        event('message_start', { type: 'message_start', message: { id: 'msg_1' } }),
        event('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'text', text: '' },
        }),
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 0,
          delta: { type: 'text_delta', text: 'Już.' },
        }),
        event('content_block_stop', { type: 'content_block_stop', index: 0 }),
        event('content_block_start', {
          type: 'content_block_start',
          index: 1,
          content_block: { type: 'tool_use', id: 'toolu_1', name: 'create_topic', input: {} },
        }),
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 1,
          delta: { type: 'input_json_delta', partial_json: '{"name": "remont' },
        }),
        event('content_block_delta', {
          type: 'content_block_delta',
          index: 1,
          delta: { type: 'input_json_delta', partial_json: ' łazienki"}' },
        }),
        event('content_block_stop', { type: 'content_block_stop', index: 1 }),
        event('message_stop', { type: 'message_stop' }),
      ],
    });

    const result = await engine.generate(
      { ...REQUEST, tools: TOPIC_TOOLS },
      () => {},
      new AbortController().signal,
    );

    expect(result).toEqual({
      text: 'Już.',
      aborted: false,
      toolCall: { name: 'create_topic', arguments: { name: 'remont łazienki' } },
    });
    expect((calls[0]!.body as { tools: unknown[] }).tools).toEqual(
      TOPIC_TOOLS.map(({ name, description, parameters }) => ({
        name,
        description,
        input_schema: parameters,
      })),
    );
  });

  it('keeps what arrived when the answer is stopped mid-stream', async () => {
    const { engine } = setup({ status: 200, chunks: stream('Mazury ', 'są ', 'piękne.') });
    const controller = new AbortController();

    const result = await engine.generate(
      REQUEST,
      (token) => token === 'są ' && controller.abort(),
      controller.signal,
    );

    expect(result).toEqual({ text: 'Mazury są ', aborted: true });
  });

  it('lists Claude models from the API with the built-in list as a fallback', async () => {
    const listed = setup({
      status: 200,
      chunks: ['{"data":[{"id":"claude-sonnet-5-5"},{"id":"claude-haiku-5-5"}]}'],
    });
    await expect(listed.engine.listModels()).resolves.toEqual(['claude-haiku-5-5', 'claude-sonnet-5-5']);

    const failing = setup({ status: 401, chunks: [] });
    await expect(failing.engine.listModels()).resolves.toEqual(ANTHROPIC_FALLBACK_MODELS);
  });

  it('rejects a key the API refuses with the Polish message', async () => {
    const { engine } = setup({ status: 401, chunks: ['{"type":"error"}'] });

    await expect(engine.validateKey('wrong')).rejects.toMatchObject({
      userMessage: 'Nieprawidłowy klucz API',
    });
  });
});
