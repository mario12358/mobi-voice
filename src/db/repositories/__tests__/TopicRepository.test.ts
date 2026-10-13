import { DomainError } from '../../../core/errors';
import { openNodeSqlDatabase } from '../../__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../migrate';
import type { SqlDatabase } from '../../SqlDatabase';
import { MessageRepository } from '../MessageRepository';
import { TopicRepository } from '../TopicRepository';

function steppingClock(start = 1_000): () => number {
  let current = start;
  return () => (current += 1_000);
}

describe('TopicRepository', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let messages: MessageRepository;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    const clock = steppingClock();
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('creates a topic with trimmed title and no overrides', async () => {
    const topic = await topics.create('  Wakacje 2026  ');
    expect(topic).toEqual({
      id: topic.id,
      title: 'Wakacje 2026',
      createdAt: 2_000,
      lastActivityAt: 2_000,
      systemPrompt: null,
      modelOverride: null,
    });
    expect(await topics.getById(topic.id)).toEqual(topic);
  });

  it('rejects an empty title', async () => {
    await expect(topics.create('   ')).rejects.toThrow(DomainError);
    expect(await topics.listByLastActivity()).toEqual([]);
  });

  it('lists topics from the most recently active', async () => {
    const work = await topics.create('Praca');
    const trip = await topics.create('Wakacje');
    const shopping = await topics.create('Zakupy');
    await messages.add({ topicId: work.id, role: 'user', content: 'Plan na jutro' });

    const titles = (await topics.listByLastActivity()).map((topic) => topic.title);
    expect(titles).toEqual(['Praca', 'Zakupy', 'Wakacje']);
    expect(trip.id).not.toBe(shopping.id);
  });

  it('finds topics by part of the title ignoring case and Polish letters case', async () => {
    await topics.create('Łódź — mieszkanie');
    await topics.create('Wakacje 2026');
    await topics.create('Remont ŁAZIENKI');

    const found = await topics.searchByTitle('  łÓ ');
    expect(found.map((topic) => topic.title)).toEqual(['Łódź — mieszkanie']);
    expect((await topics.searchByTitle('ła')).map((topic) => topic.title)).toEqual(['Remont ŁAZIENKI']);
    expect(await topics.searchByTitle('')).toHaveLength(3);
  });

  it('renames a topic and stores per-topic prompt and model', async () => {
    const topic = await topics.create('Robocza nazwa');

    await topics.rename(topic.id, 'Budżet domowy');
    await topics.setSystemPrompt(topic.id, 'Odpowiadaj jak księgowy');
    const updated = await topics.setModelOverride(topic.id, 'qwen2.5-3b');

    expect(updated).toMatchObject({
      title: 'Budżet domowy',
      systemPrompt: 'Odpowiadaj jak księgowy',
      modelOverride: 'qwen2.5-3b',
    });
    expect((await topics.setSystemPrompt(topic.id, '  ')).systemPrompt).toBeNull();
  });

  it('reports a missing topic instead of silently doing nothing', async () => {
    await expect(topics.rename(999, 'X')).rejects.toMatchObject({ code: 'topic_not_found' });
    await expect(topics.delete(999)).rejects.toMatchObject({ code: 'topic_not_found' });
  });

  // specky: crit 01M4TPSB44SA09NE6D546BP4WB
  it('deleting a topic removes its messages and summaries but not other topics', async () => {
    const doomed = await topics.create('Do usunięcia');
    const kept = await topics.create('Zostaje');
    await messages.add({ topicId: doomed.id, role: 'user', content: 'Pytanie' });
    await messages.add({ topicId: doomed.id, role: 'assistant', content: 'Odpowiedź' });
    await messages.add({ topicId: kept.id, role: 'user', content: 'Inne pytanie' });
    await db.runAsync('INSERT INTO summaries (topic_id, content, created_at) VALUES (?, ?, ?)', [
      doomed.id,
      'Notatka',
      1,
    ]);
    await db.runAsync('INSERT INTO summaries (topic_id, content, created_at) VALUES (?, ?, ?)', [
      kept.id,
      'Inna notatka',
      1,
    ]);

    await topics.delete(doomed.id);

    expect(await topics.getById(doomed.id)).toBeNull();
    expect(await messages.listByTopic(doomed.id)).toEqual([]);
    expect(await db.getAllAsync('SELECT topic_id FROM summaries')).toEqual([{ topic_id: kept.id }]);
    expect(await messages.listByTopic(kept.id)).toHaveLength(1);
  });
});
