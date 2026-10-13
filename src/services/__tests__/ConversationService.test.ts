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
});
