import { AudioSessionService } from '../../../audio/AudioSessionService';
import { FakeAudioPorts } from '../../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { ContextSummaryRepository } from '../../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository, type Topic } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { encodeWav, synthesize } from '../../../engines/__tests__/support/audio';
import { EnergyVadEngine } from '../../../engines/fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from '../../../engines/fakes/FakeKeywordSpotter';
import { FakeLlmEngine } from '../../../engines/fakes/FakeLlmEngine';
import { FakeSttEngine } from '../../../engines/fakes/FakeSttEngine';
import { FakeTtsEngine } from '../../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../../engines/fakes/WavAudioSource';
import { ContextBuilder } from '../../ContextBuilder';
import { ConversationService } from '../../ConversationService';
import { COMMAND_REPLIES, LISTED_TOPICS, TopicCommands } from '../TopicCommands';
import { VoiceSessionController } from '../VoiceSessionController';
import { until } from './support/until';

describe('voice commands in a voice session', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let messages: MessageRepository;
  let llm: FakeLlmEngine;
  let source: WavAudioSource;
  let stt: FakeSttEngine;
  let tts: FakeTtsEngine;
  let controller: VoiceSessionController;
  let changes: Topic[];
  let lists: Topic[][];
  let startTopic: Topic;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1_000);
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
    llm = new FakeLlmEngine(() => 'Odpowiedź modelu.');
    source = new WavAudioSource();
    stt = new FakeSttEngine();
    tts = new FakeTtsEngine(0);
    const vad = new EnergyVadEngine();
    const spotter = new FakeKeywordSpotter();
    controller = new VoiceSessionController({
      audio: new AudioSessionService({ ...new FakeAudioPorts(), source: () => source, tts: () => tts }),
      vad: () => vad,
      stt: () => stt,
      tts: () => tts,
      keywordSpotter: () => spotter,
      conversation: new ConversationService({
        topics,
        messages,
        context: new ContextBuilder(messages, new ContextSummaryRepository(db, clock), {
          summarize: async () => '',
        }),
        llm: () => llm,
        budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
        systemPrompt: () => null,
      }),
      silenceThresholdMs: () => 1_500,
      mode: () => 'continuous',
      commands: new TopicCommands(topics),
    });
    changes = [];
    lists = [];
    for (const title of ['Zakupy na weekend', 'Zakupy świąteczne', 'Remont kuchni', 'Wakacje 2026']) {
      await topics.create(title);
    }
    startTopic = await topics.create('Bieżąca rozmowa');
    await controller.start(startTopic.id, {
      onTopicChange: (topic) => changes.push(topic),
      onTopicList: (listed) => lists.push(listed),
    });
  });

  afterEach(async () => {
    await controller.stop();
    await db.closeAsync();
  });

  async function say(transcript: string): Promise<void> {
    const spoken = tts.spoken.length;
    stt.enqueue(transcript);
    source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
    await until(() => tts.spoken.length > spoken && controller.current === 'listening');
  }

  // specky: crit 01M4TPSD985J6R5DR64N3QGXJD
  it('"przełącz na temat wakacje" opens the topic with the most similar name and continues there', async () => {
    await say('Przełącz na temat wakacje');

    expect(changes.map((topic) => topic.title)).toEqual(['Wakacje 2026']);
    expect(tts.spoken.at(-1)).toBe(COMMAND_REPLIES.switched('Wakacje 2026'));
    expect(llm.requests).toHaveLength(0);

    await say('Gdzie jechać?');
    const wakacje = changes[0];
    expect((await messages.listByTopic(wakacje?.id ?? 0)).map((message) => message.content)).toEqual([
      'Gdzie jechać?',
      'Odpowiedź modelu.',
    ]);
    expect(await messages.listByTopic(startTopic.id)).toEqual([]);
  });

  // specky: crit 01M4TPSD984YDF8YSTV0EF3KY4
  it('"nowy temat X" creates topic X and opens it', async () => {
    await say('Nowy temat remont łazienki');

    const created = changes[0];
    expect(created?.title).toBe('remont łazienki');
    expect((await topics.getById(created?.id ?? 0))?.title).toBe('remont łazienki');
    expect(tts.spoken.at(-1)).toBe(COMMAND_REPLIES.created('remont łazienki'));
    expect(llm.requests).toHaveLength(0);
  });

  // specky: crit 01M4TPSD987TH60PDGRVVP5CGS
  it('"jakie mam tematy" reads out and shows the recent topics', async () => {
    for (let index = 0; index < 6; index += 1) await topics.create(`Temat dodatkowy ${index + 1}`);

    await say('Jakie mam tematy?');

    const listed = lists[0] ?? [];
    expect(listed.length).toBe(LISTED_TOPICS);
    expect(listed.length).toBeGreaterThanOrEqual(5);
    expect(listed[0]?.title).toBe('Temat dodatkowy 6');
    expect(tts.spoken.at(-1)).toBe(COMMAND_REPLIES.list(listed.map((topic) => topic.title)));
    expect(llm.requests).toHaveLength(0);
  });

  // specky: crit 01M4TPSD98AJYHCJKQ4XRCQ8YT
  it('asks back by voice when the name fits two topics, then opens the one named', async () => {
    await say('Otwórz temat zakupy');

    expect(tts.spoken.at(-1)).toBe(COMMAND_REPLIES.which(['Zakupy świąteczne', 'Zakupy na weekend']));
    expect(changes).toEqual([]);

    await say('Świąteczne');

    expect(changes.map((topic) => topic.title)).toEqual(['Zakupy świąteczne']);
    expect(llm.requests).toHaveLength(0);
  });

  it('says so when no topic fits, and sends ordinary questions to the model as usual', async () => {
    await say('Przełącz na temat samochód');
    expect(tts.spoken.at(-1)).toBe(COMMAND_REPLIES.notFound('samochód'));

    await say('Ile kosztuje bilet do Gdańska?');
    expect(llm.requests).toHaveLength(1);
    expect(tts.spoken.at(-1)).toBe('Odpowiedź modelu.');
  });
});
