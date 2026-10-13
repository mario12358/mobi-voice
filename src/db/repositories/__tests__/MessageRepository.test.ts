import { openNodeSqlDatabase } from '../../__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../migrate';
import type { SqlDatabase } from '../../SqlDatabase';
import { MessageRepository } from '../MessageRepository';
import { TopicRepository } from '../TopicRepository';

describe('MessageRepository', () => {
  let db: SqlDatabase;
  let now: number;
  let topics: TopicRepository;
  let messages: MessageRepository;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    now = 10_000;
    const clock = () => now;
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('adding a message moves the topic last activity to the message time', async () => {
    const topic = await topics.create('Wakacje');
    now = 25_000;

    const message = await messages.add({ topicId: topic.id, role: 'user', content: 'Gdzie jechać?' });

    expect(message).toEqual({
      id: message.id,
      topicId: topic.id,
      role: 'user',
      content: 'Gdzie jechać?',
      createdAt: 25_000,
      interrupted: false,
    });
    expect((await topics.getById(topic.id))?.lastActivityAt).toBe(25_000);
  });

  it('returns the topic history in chronological order with the interrupted flag', async () => {
    const topic = await topics.create('Wakacje');
    const other = await topics.create('Praca');
    now = 11_000;
    await messages.add({ topicId: topic.id, role: 'user', content: 'Gdzie jechać?' });
    await messages.add({ topicId: other.id, role: 'user', content: 'Inny temat' });
    now = 12_000;
    await messages.add({ topicId: topic.id, role: 'assistant', content: 'Może Maz', interrupted: true });
    await messages.add({ topicId: topic.id, role: 'user', content: 'A w górach?' });

    const history = await messages.listByTopic(topic.id);

    expect(history.map(({ role, content, interrupted }) => ({ role, content, interrupted }))).toEqual([
      { role: 'user', content: 'Gdzie jechać?', interrupted: false },
      { role: 'assistant', content: 'Może Maz', interrupted: true },
      { role: 'user', content: 'A w górach?', interrupted: false },
    ]);
  });

  it('does not store a message for a topic that does not exist', async () => {
    await expect(messages.add({ topicId: 404, role: 'user', content: 'x' })).rejects.toMatchObject({
      code: 'topic_not_found',
    });
    expect(await db.getFirstAsync('SELECT COUNT(*) AS count FROM messages')).toEqual({ count: 0 });
  });
});
