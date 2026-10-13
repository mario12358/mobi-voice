import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { migrate, prepareDatabase } from '../../db/migrate';
import { MIGRATIONS } from '../../db/migrations';
import { ContextSummaryRepository } from '../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { FakeLlmEngine } from '../../engines/fakes/FakeLlmEngine';
import type { LlmRequest } from '../../engines/types';
import { ContextBuilder } from '../ContextBuilder';
import { ConversationService } from '../ConversationService';
import { TITLE_SYSTEM_PROMPT } from '../prompts';
import { cleanTitle, TopicTitler } from '../TopicTitler';

const PLACEHOLDER = 'Nowa rozmowa';

function scriptedLlm(): FakeLlmEngine {
  return new FakeLlmEngine((request: LlmRequest) =>
    request.systemPrompt === TITLE_SYSTEM_PROMPT ? '"Wakacje nad jeziorem."' : 'Polecam Mazury.',
  );
}

describe('automatic topic title', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let llm: FakeLlmEngine;
  let service: ConversationService;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topics = new TopicRepository(db);
    const messages = new MessageRepository(db);
    llm = scriptedLlm();
    service = new ConversationService({
      topics,
      messages,
      context: new ContextBuilder(messages, new ContextSummaryRepository(db), { summarize: async () => '' }),
      llm: () => llm,
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      systemPrompt: () => null,
      titler: new TopicTitler(() => llm),
    });
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // specky: crit 01M4TPSBN0GQJGEGSSKYGGKXAP
  it('gives a placeholder-titled topic a generated title after the first answer', async () => {
    const topic = await topics.create(PLACEHOLDER, 'default');

    const exchange = await service.send(topic.id, 'Gdzie pojechać nad jezioro?');

    expect(exchange.newTitle).toBe('Wakacje nad jeziorem');
    expect(await topics.getById(topic.id)).toMatchObject({
      title: 'Wakacje nad jeziorem',
      titleSource: 'auto',
    });
    expect(llm.requests[1]?.messages[0]?.content).toContain('Gdzie pojechać nad jezioro?');
    expect(llm.requests[1]?.messages[0]?.content).toContain('Polecam Mazury.');
  });

  it('titles a topic only once', async () => {
    const topic = await topics.create(PLACEHOLDER, 'default');
    await service.send(topic.id, 'Gdzie pojechać?');

    const second = await service.send(topic.id, 'A kiedy?');

    expect(second.newTitle).toBeNull();
    expect(llm.requests.filter((request) => request.systemPrompt === TITLE_SYSTEM_PROMPT)).toHaveLength(1);
  });

  // specky: crit 01M4TPSBN0DRTYPHEH2TNZAC6A
  it('never overwrites a name the user gave the topic', async () => {
    const renamedLater = await topics.create(PLACEHOLDER, 'default');
    await topics.rename(renamedLater.id, 'Mój urlop');
    const namedUpFront = await topics.create('Budżet domowy');

    await service.send(renamedLater.id, 'Gdzie pojechać?');
    await service.send(namedUpFront.id, 'Ile odkładać?');

    expect((await topics.getById(renamedLater.id))?.title).toBe('Mój urlop');
    expect((await topics.getById(namedUpFront.id))?.title).toBe('Budżet domowy');
    expect(llm.requests.some((request) => request.systemPrompt === TITLE_SYSTEM_PROMPT)).toBe(false);
  });

  it('keeps the user rename made while the title was being generated', async () => {
    const topic = await topics.create(PLACEHOLDER, 'default');
    await topics.rename(topic.id, 'Szybsza nazwa');

    expect(await topics.applyAutoTitle(topic.id, 'Wygenerowany')).toBe(false);
    expect((await topics.getById(topic.id))?.title).toBe('Szybsza nazwa');
  });

  it('keeps the placeholder and reports the error when titling fails', async () => {
    const topic = await topics.create(PLACEHOLDER, 'default');
    const failing = new ConversationService({
      topics,
      messages: new MessageRepository(db),
      context: new ContextBuilder(new MessageRepository(db), new ContextSummaryRepository(db), {
        summarize: async () => '',
      }),
      llm: () => llm,
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      systemPrompt: () => null,
      titler: { generate: async () => Promise.reject(new Error('timeout')) } as unknown as TopicTitler,
    });

    const exchange = await failing.send(topic.id, 'Hej');

    expect(exchange.assistantMessage?.content).toBe('Polecam Mazury.');
    expect(exchange.titleError?.code).toBe('provider_error');
    expect((await topics.getById(topic.id))?.title).toBe(PLACEHOLDER);
  });

  it.each([
    ['"Wakacje nad jeziorem."', 'Wakacje nad jeziorem'],
    ['Tytuł: Plan budżetu', 'Plan budżetu'],
    ['«Remont kuchni»\nDodatkowy komentarz', 'Remont kuchni'],
    ['A'.repeat(80), `${'A'.repeat(59)}…`],
  ])('cleans the model output %p', (raw, expected) => {
    expect(cleanTitle(raw)).toBe(expected);
  });

  it('marks topics left with the old placeholder as awaiting a title when upgrading the database', async () => {
    const legacy = openNodeSqlDatabase();
    await migrate(legacy, MIGRATIONS.slice(0, 2));
    await legacy.runAsync(
      'INSERT INTO topics (title, created_at, last_activity_at) VALUES (?, 1, 1), (?, 1, 1)',
      [PLACEHOLDER, 'Własna nazwa'],
    );

    await migrate(legacy);

    expect(await legacy.getAllAsync('SELECT title, title_source FROM topics ORDER BY id')).toEqual([
      { title: PLACEHOLDER, title_source: 'default' },
      { title: 'Własna nazwa', title_source: 'manual' },
    ]);
    await legacy.closeAsync();
  });
});
