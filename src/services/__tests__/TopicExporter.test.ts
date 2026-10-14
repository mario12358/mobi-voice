import { MemoryApiKeys } from '../../cloud/__tests__/support/memoryApiKeys';
import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { pl } from '../../i18n/pl';
import { TopicExporter } from '../TopicExporter';

// 14 Oct 2026, 10:00 UTC and later; dates are checked with the same formatter the export uses.
const T0 = Date.UTC(2026, 9, 14, 10, 0);
const DATE = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
const at = (time: number) => DATE.format(new Date(time));

describe('TopicExporter', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let messages: MessageRepository;
  let keys: MemoryApiKeys;
  let exporter: TopicExporter;
  let topicId: number;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = T0;
    const clock = () => (now += 60_000);
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
    keys = new MemoryApiKeys();
    exporter = new TopicExporter(topics, messages, keys, () => T0 + 3_600_000);
    topicId = (await topics.create('Remont kuchni')).id;
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // specky: crit 01M4TPSDDKNPG4W9S9AY939Y4S
  it('exports the title and every message with its role and date, in order', async () => {
    const question = await messages.add({ topicId, role: 'user', content: 'Jakie płytki do kuchni?' });
    const answer = await messages.add({
      topicId,
      role: 'assistant',
      content: 'Gres, matowy.\n\n- łatwy w czyszczeniu',
    });
    const cut = await messages.add({ topicId, role: 'assistant', content: 'Fugi warto', interrupted: true });

    const exported = await exporter.export(topicId);

    expect(exported.title).toBe('Remont kuchni');
    expect(exported.markdown).toBe(
      [
        '# Remont kuchni',
        '',
        `_${pl.topicExport.exportedAt(at(T0 + 3_600_000))}_`,
        '',
        `**Użytkownik** · ${at(question.createdAt)}`,
        '',
        'Jakie płytki do kuchni?',
        '',
        '---',
        '',
        `**Asystent** · ${at(answer.createdAt)}`,
        '',
        'Gres, matowy.',
        '',
        '- łatwy w czyszczeniu',
        '',
        '---',
        '',
        `**Asystent** · ${at(cut.createdAt)} ${pl.topicExport.interrupted}`,
        '',
        'Fugi warto',
        '',
      ].join('\n'),
    );
  });

  // specky: crit 01M4TPSDDKNG7GAK3ZAKTFG5W3
  it('never contains an API key, even one pasted into the conversation', async () => {
    await keys.setApiKey('openai', 'sk-proj-SEKRET123');
    await keys.setApiKey('anthropic', 'sk-ant-SEKRET456');
    await messages.add({ topicId, role: 'user', content: 'Mój klucz to sk-proj-SEKRET123, czy jest dobry?' });
    await messages.add({
      topicId,
      role: 'assistant',
      content: 'Nie podawaj klucza sk-proj-SEKRET123 nikomu.',
    });

    const { markdown } = await exporter.export(topicId);

    expect(markdown).not.toContain('SEKRET');
    expect(markdown).toContain(`Mój klucz to ${pl.topicExport.keyRemoved}, czy jest dobry?`);
    expect(markdown).toContain(`Nie podawaj klucza ${pl.topicExport.keyRemoved} nikomu.`);
  });

  it('exports a topic without messages and refuses one that does not exist', async () => {
    expect((await exporter.export(topicId)).markdown).toContain(pl.topicExport.empty);
    await expect(exporter.export(999)).rejects.toMatchObject({ code: 'topic_not_found' });
  });
});
