import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { ContextSummaryRepository } from '../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { FakeLlmEngine } from '../../engines/fakes/FakeLlmEngine';
import type { LlmRequest } from '../../engines/types';
import { ContextBuilder } from '../ContextBuilder';
import { ConversationService } from '../ConversationService';
import { CONTEXT_SUMMARY_HEADER } from '../prompts';

describe('ConversationService', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let messages: MessageRepository;
  let llm: FakeLlmEngine;
  let service: ConversationService;
  let topicId: number;
  let replies: string[];

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1);
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
    replies = [
      'Proponuję Mazury, bo są blisko. Jezioro Śniardwy jest największe.',
      'Tak, w lipcu jest ciepło.',
    ];
    llm = new FakeLlmEngine(() => replies.shift() ?? '');
    service = new ConversationService({
      topics,
      messages,
      context: new ContextBuilder(messages, new ContextSummaryRepository(db, clock), {
        summarize: async () => 'streszczenie',
      }),
      llm: () => llm,
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      systemPrompt: (topic) => topic.systemPrompt ?? 'Odpowiadaj zwięźle.',
    });
    topicId = (await topics.create('Wakacje')).id;
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('stores the question, streams the answer and stores it in the topic', async () => {
    const tokens: string[] = [];

    const exchange = await service.send(topicId, '  Gdzie pojechać na wakacje?  ', {
      onToken: (token) => tokens.push(token),
    });

    expect(tokens.join('')).toBe('Proponuję Mazury, bo są blisko. Jezioro Śniardwy jest największe.');
    expect(exchange.interrupted).toBe(false);
    expect(
      (await messages.listByTopic(topicId)).map(({ role, content, interrupted }) => [
        role,
        content,
        interrupted,
      ]),
    ).toEqual([
      ['user', 'Gdzie pojechać na wakacje?', false],
      ['assistant', 'Proponuję Mazury, bo są blisko. Jezioro Śniardwy jest największe.', false],
    ]);
    expect(llm.requests[0]).toEqual<LlmRequest>({
      systemPrompt: 'Odpowiadaj zwięźle.',
      messages: [{ role: 'user', content: 'Gdzie pojechać na wakacje?' }],
    });
  });

  it('sends the earlier exchange as context of the next question', async () => {
    await service.send(topicId, 'Gdzie pojechać na wakacje?');
    await service.send(topicId, 'A czy w lipcu jest ciepło?');

    expect(llm.requests[1]?.messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(llm.requests[1]?.messages.at(-1)?.content).toBe('A czy w lipcu jest ciepło?');
  });

  it('keeps an interrupted answer in the history, marked, and sends it as context next time', async () => {
    const controller = new AbortController();
    let count = 0;

    const exchange = await service.send(topicId, 'Gdzie pojechać na wakacje?', {
      signal: controller.signal,
      onToken: () => {
        count += 1;
        if (count === 3) controller.abort();
      },
    });

    expect(exchange.interrupted).toBe(true);
    expect(exchange.assistantMessage).toMatchObject({ content: 'Proponuję Mazury, bo', interrupted: true });
    await service.send(topicId, 'Dokończ proszę.');
    expect(llm.requests[1]?.messages).toEqual([
      { role: 'user', content: 'Gdzie pojechać na wakacje?' },
      { role: 'assistant', content: 'Proponuję Mazury, bo' },
      { role: 'user', content: 'Dokończ proszę.' },
    ]);
    expect((await messages.listByTopic(topicId))[1]?.interrupted).toBe(true);
  });

  it('stores nothing for the assistant when stopped before the first token', async () => {
    const controller = new AbortController();
    controller.abort();

    const exchange = await service.send(topicId, 'Gdzie?', { signal: controller.signal });

    expect(exchange).toMatchObject({ assistantMessage: null, interrupted: true });
    expect(await messages.listByTopic(topicId)).toHaveLength(1);
  });

  it('uses the topic system prompt when the topic has one', async () => {
    await topics.setSystemPrompt(topicId, 'Mów jak przewodnik turystyczny.');
    await service.send(topicId, 'Co zwiedzić?');
    expect(llm.requests[0]?.systemPrompt).toBe('Mów jak przewodnik turystyczny.');
  });

  it('keeps the question when the model fails, and reports the failure', async () => {
    const failing = new ConversationService({
      topics,
      messages,
      context: new ContextBuilder(messages, new ContextSummaryRepository(db), { summarize: async () => '' }),
      llm: () => ({ generate: async () => Promise.reject(new Error('model crashed')) }),
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      systemPrompt: () => null,
    });

    await expect(failing.send(topicId, 'Halo?')).rejects.toThrow('model crashed');
    expect((await messages.listByTopic(topicId)).map((message) => message.content)).toEqual(['Halo?']);
  });

  it('rejects a topic that does not exist', async () => {
    await expect(service.send(999, 'x')).rejects.toMatchObject({ code: 'topic_not_found' });
  });

  // specky: crit 01M4TPSD05K5NH3VE5Q66NVXJM
  it("keeps the history when the topic's model changes and fits the context to the new model's budget", async () => {
    const topics2 = new TopicRepository(db);
    const budgets: Record<string, number> = { big: 4_096, tiny: 60 };
    const perModel = new ConversationService({
      topics: topics2,
      messages,
      context: new ContextBuilder(messages, new ContextSummaryRepository(db), {
        summarize: async () => 'streszczenie',
      }),
      llm: () => llm,
      budget: (topic) => ({
        contextTokens: budgets[topic.modelOverride ?? 'big'] ?? 4_096,
        maxOutputTokens: 8,
      }),
      model: (topic) => topic.modelOverride ?? 'big',
      systemPrompt: () => null,
    });
    replies = ['Pierwsza dość długa odpowiedź o jeziorach na Mazurach.', 'Druga.', 'Trzecia.'];
    await perModel.send(topicId, 'Opowiedz o jeziorach na Mazurach i okolicy.');
    await perModel.send(topicId, 'A które jest największe?');

    await topics2.setModelOverride(topicId, 'tiny');
    await perModel.send(topicId, 'Krótko proszę.');

    expect(llm.requests[1]?.model).toBe('big');
    expect(llm.requests[1]?.messages).toHaveLength(3);
    expect(llm.requests[2]?.model).toBe('tiny');
    // The whole history (4 messages) and the question would not fit the tiny model: older turns go to a summary.
    expect(llm.requests[2]?.messages.length).toBeLessThan(5);
    expect(llm.requests[2]?.systemPrompt).toContain(CONTEXT_SUMMARY_HEADER);
    expect(llm.requests[2]?.messages.at(-1)).toEqual({ role: 'user', content: 'Krótko proszę.' });
    expect(await messages.listByTopic(topicId)).toHaveLength(6);
  });
});
