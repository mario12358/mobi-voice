import { FakeAudioPorts } from '../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { encodeWav, synthesize } from '../../engines/__tests__/support/audio';
import { createTestFactories, EngineRegistry } from '../../engines/EngineRegistry';
import { FakeLlmEngine } from '../../engines/fakes/FakeLlmEngine';
import { FakeSttEngine } from '../../engines/fakes/FakeSttEngine';
import { FakeTtsEngine } from '../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../engines/fakes/WavAudioSource';
import { MemoryModelFileSystem } from '../../models/download/__tests__/support/memoryModelFileSystem';
import { createServices, type AppServices } from '../../services/ServicesProvider';
import { until } from '../../services/voice/__tests__/support/until';
import type { CloudProvider } from '../../state/SecretStore';
import { useSettingsStore } from '../../state/settings';
import type { FetchLike } from '../CloudHttpClient';
import { MemoryShareSheet } from '../../share/memoryShareSheet';
import { MemoryApiKeys } from '../../e2e/MemoryApiKeys';
import { recordedServer, sse } from './support/recordedServer';

// Each provider's own streaming format, as recorded from its API.
const STREAMS: Record<CloudProvider, (texts: string[]) => string[]> = {
  openai: (texts) => sse(...texts.map((content) => ({ choices: [{ delta: { content } }] })), '[DONE]'),
  meta: (texts) => sse(...texts.map((content) => ({ choices: [{ delta: { content } }] })), '[DONE]'),
  anthropic: (texts) =>
    texts.map(
      (text) =>
        `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`,
    ),
  google: (texts) => sse(...texts.map((text) => ({ candidates: [{ content: { parts: [{ text }] } }] }))),
};

const MODELS: Record<CloudProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-5-5',
  google: 'gemini-2.5-flash',
  meta: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
};

describe('conversation on a cloud model', () => {
  let db: SqlDatabase;
  let local: FakeLlmEngine;
  let source: WavAudioSource;
  let stt: FakeSttEngine;
  let tts: FakeTtsEngine;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    useSettingsStore.getState().reset();
    useSettingsStore.getState().update({ silenceThresholdMs: 1_500 });
    local = new FakeLlmEngine(() => 'Odpowiedź modelu lokalnego.');
    source = new WavAudioSource();
    stt = new FakeSttEngine();
    tts = new FakeTtsEngine(0);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function servicesFor(
    provider: CloudProvider,
    fetch: FetchLike,
  ): Promise<{ services: AppServices; topicId: number }> {
    const keys = new MemoryApiKeys();
    await keys.setApiKey(provider, `test-${provider}-key`);
    const engines = new EngineRegistry('test', {
      ...createTestFactories(),
      llm: () => local,
      stt: () => stt,
      tts: () => tts,
      audioSource: () => source,
    });
    const services = createServices(db, engines, {
      fileSystem: new MemoryModelFileSystem(new Map()),
      network: { connection: async () => 'wifi' },
      audio: new FakeAudioPorts(),
      memoryBytes: () => null,
      apiKeys: keys,
      fetch,
      share: new MemoryShareSheet(),
    });
    const topic = await services.topics.create('Chmura');
    await services.topics.setModelOverride(topic.id, `cloud:${provider}:${MODELS[provider]}`);
    return { services, topicId: topic.id };
  }

  // specky: crit 01M4TPSD3NTQ77B4DZMD45444S
  it.each(['openai', 'anthropic', 'google', 'meta'] as CloudProvider[])(
    '%s: a saved key lets the topic talk by text and by voice in both modes',
    async (provider) => {
      const server = recordedServer(
        { status: 200, chunks: STREAMS[provider](['Tekstem: ', 'Mazury.']) },
        { status: 200, chunks: STREAMS[provider](['Głosem ', 'ciągłym.']) },
        { status: 200, chunks: STREAMS[provider](['Głosem ', 'przerywanym.']) },
      );
      const { services, topicId } = await servicesFor(provider, server.fetch);
      expect(
        await services.isModelReady(services.modelForTopic(await services.topics.getById(topicId))),
      ).toBe(true);

      await services.conversation.send(topicId, 'Gdzie jechać?');

      stt.enqueue('A w lipcu?');
      await services.voice.start(topicId);
      source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
      await until(() => tts.spoken.includes('Głosem ciągłym.'));
      await until(() => services.voice.current === 'listening');

      useSettingsStore.getState().update({ conversationMode: 'interrupted' });
      stt.enqueue('A zimą? Odbiór.');
      source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
      await until(() => tts.spoken.includes('Głosem przerywanym.'));
      await services.voice.stop();

      const history = await services.messages.listByTopic(topicId);
      expect(history.map((message) => message.content)).toEqual([
        'Gdzie jechać?',
        'Tekstem: Mazury.',
        'A w lipcu?',
        'Głosem ciągłym.',
        'A zimą?',
        'Głosem przerywanym.',
      ]);
      expect(server.calls).toHaveLength(3);
      expect(local.requests).toHaveLength(0);
    },
  );

  it('STOP cuts the HTTP request of a cloud answer and keeps what arrived', async () => {
    let cut = false;
    // The provider sends one part of the answer, then keeps the connection open until it is cut.
    const fetch: FetchLike = async (_url, init) => {
      const encoder = new TextEncoder();
      let sent = false;
      return {
        status: 200,
        text: async () => '',
        body: {
          getReader: () => ({
            read: () =>
              new Promise((resolve, reject) => {
                if (!sent) {
                  sent = true;
                  resolve({
                    done: false,
                    value: encoder.encode(STREAMS.openai(['Mazury to kraina jezior.'])[0] ?? ''),
                  });
                  return;
                }
                const cutConnection = () => {
                  cut = true;
                  reject(new Error('aborted'));
                };
                // Like a real connection: a read after the abort fails at once.
                if (init.signal.aborted) cutConnection();
                else init.signal.addEventListener('abort', cutConnection);
              }),
          }),
        },
      };
    };
    const { services, topicId } = await servicesFor('openai', fetch);
    const controller = new AbortController();

    const exchange = await services.conversation.send(topicId, 'Opowiedz o Mazurach.', {
      signal: controller.signal,
      onToken: () => controller.abort(),
    });

    expect(cut).toBe(true);
    expect(exchange.interrupted).toBe(true);
    expect(exchange.assistantMessage).toMatchObject({
      content: 'Mazury to kraina jezior.',
      interrupted: true,
    });
  });

  // specky: crit 01M4TPSD6AB72A3G4V786PZ9KZ
  it('shows the provider failure after the retries and never answers with the local model instead', async () => {
    let attempts = 0;
    const offline: FetchLike = async () => {
      attempts += 1;
      throw new TypeError('Network request failed');
    };
    const { services, topicId } = await servicesFor('google', offline);

    await expect(services.conversation.send(topicId, 'Halo?')).rejects.toMatchObject({
      userMessage: 'Brak połączenia z siecią',
    });

    expect(attempts).toBe(3);
    expect(local.requests).toHaveLength(0);
    expect((await services.messages.listByTopic(topicId)).map((message) => message.content)).toEqual([
      'Halo?',
    ]);
  }, 10_000);
});
