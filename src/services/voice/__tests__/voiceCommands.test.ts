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
import { SummaryRepository } from '../../../db/repositories/SummaryRepository';
import { SummaryTemplateRepository } from '../../../db/repositories/SummaryTemplateRepository';
import type { LlmScript } from '../../../engines/fakes/FakeLlmEngine';
import { ContextBuilder } from '../../ContextBuilder';
import { ConversationService } from '../../ConversationService';
import { SUMMARY_SYSTEM_PROMPT } from '../../prompts';
import { SummaryService } from '../../SummaryService';
import { COMMAND_REPLIES, LISTED_TOPICS, TopicCommands } from '../TopicCommands';
import { VoiceSessionController } from '../VoiceSessionController';
import { until } from './support/until';

// The model writes summaries in Markdown; everything else gets a one-sentence answer.
const SUMMARY_MARKDOWN = '**Ustalenia:**\n- Jedziemy na Mazury.\n- Nocleg w Giżycku.';
const SCRIPT: LlmScript = (request) =>
  request.systemPrompt === SUMMARY_SYSTEM_PROMPT ? SUMMARY_MARKDOWN : 'Odpowiedź modelu.';

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
  let spotter: FakeKeywordSpotter;
  let summaries: SummaryService;
  let startTopic: Topic;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1_000);
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
    llm = new FakeLlmEngine(SCRIPT);
    source = new WavAudioSource();
    stt = new FakeSttEngine();
    tts = new FakeTtsEngine(0);
    const vad = new EnergyVadEngine();
    spotter = new FakeKeywordSpotter();
    summaries = new SummaryService({
      topics,
      messages,
      summaries: new SummaryRepository(db, clock),
      templates: new SummaryTemplateRepository(db, clock),
      llm: () => llm,
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      model: () => 'test',
    });
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
      commands: new TopicCommands(topics, (topicId, signal) =>
        summaries.generateInLastForm(topicId, signal).then((summary) => summary.content),
      ),
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

  it('"podsumuj rozmowę" saves a summary with the topic in the form used last and reads it aloud', async () => {
    await say('Gdzie nocować na Mazurach?');
    const templates = await new SummaryTemplateRepository(db).list();
    const tasks = templates.find((template) => template.name === 'Lista zadań')!;
    await summaries.generate(startTopic.id, { instruction: tasks.instruction, templateId: tasks.id });

    await say('Podsumuj rozmowę');

    const saved = await summaries.latest(startTopic.id);
    expect(saved).toMatchObject({ templateId: tasks.id, content: SUMMARY_MARKDOWN });
    expect(llm.requests.at(-1)!.messages[0]!.content.startsWith(tasks.instruction)).toBe(true);
    // Read sentence by sentence without the Markdown marks; not added to the conversation.
    expect(tts.spoken.slice(-3)).toEqual(['Ustalenia:', 'Jedziemy na Mazury.', 'Nocleg w Giżycku.']);
    expect((await messages.listByTopic(startTopic.id)).map((message) => message.content)).toEqual([
      'Gdzie nocować na Mazurach?',
      'Odpowiedź modelu.',
    ]);
  });

  it('"stop" while the summary is prepared saves nothing and listens again', async () => {
    llm = new FakeLlmEngine(SCRIPT, 40);
    const spoken = tts.spoken.length;
    stt.enqueue('Podsumuj rozmowę');
    source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
    await until(() => llm.requests.length > 0);

    spotter.trigger('stop');

    await until(() => controller.current === 'listening');
    // Longer than the whole summary would take (9 tokens × 40 ms) had it not been stopped.
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(await summaries.latest(startTopic.id)).toBeNull();
    expect(tts.spoken.length).toBe(spoken);
  });
});
