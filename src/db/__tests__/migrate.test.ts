import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { DomainError } from '../../core/errors';
import { migrate, prepareDatabase, rollbackTo } from '../migrate';
import { MIGRATIONS } from '../migrations';
import { initialSchema } from '../migrations/001_initial_schema';
import type { SqlDatabase } from '../SqlDatabase';
import { openNodeSqlDatabase } from './support/nodeSqlDatabase';

async function tableNames(db: SqlDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

async function insertTopicWithHistory(db: SqlDatabase): Promise<number> {
  const topic = await db.runAsync(
    'INSERT INTO topics (title, created_at, last_activity_at) VALUES (?, ?, ?)',
    ['Wakacje 2026', 1000, 2000],
  );
  const topicId = topic.lastInsertRowId;
  await db.runAsync('INSERT INTO messages (topic_id, role, content, created_at) VALUES (?, ?, ?, ?)', [
    topicId,
    'user',
    'Gdzie jechać w lipcu?',
    1500,
  ]);
  await db.runAsync(
    'INSERT INTO messages (topic_id, role, content, created_at, interrupted) VALUES (?, ?, ?, ?, ?)',
    [topicId, 'assistant', 'Proponuję Mazury', 1600, 1],
  );
  const template = await db.runAsync(
    'INSERT INTO summary_templates (name, instruction, is_builtin, created_at) VALUES (?, ?, ?, ?)',
    ['Notatka', 'Napisz notatkę', 1, 1000],
  );
  await db.runAsync(
    'INSERT INTO summaries (topic_id, template_id, content, created_at) VALUES (?, ?, ?, ?)',
    [topicId, template.lastInsertRowId, 'Plan: Mazury', 1700],
  );
  return topicId;
}

describe('database migrations', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = openNodeSqlDatabase();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('creates topics, messages, summaries and summary_templates on a fresh database', async () => {
    expect(await migrate(db)).toEqual([1]);
    expect(await tableNames(db)).toEqual([
      'messages',
      'schema_migrations',
      'summaries',
      'summary_templates',
      'topics',
    ]);
  });

  // specky: crit 01M4TPSB44R4TGWZV7K4HZT7HV
  it('running migrations again changes nothing and keeps data', async () => {
    await prepareDatabase(db);
    await insertTopicWithHistory(db);

    expect(await migrate(db)).toEqual([]);
    const migrationRows = await db.getAllAsync('SELECT version FROM schema_migrations');
    expect(migrationRows).toEqual([{ version: 1 }]);
    expect(await db.getAllAsync('SELECT title FROM topics')).toEqual([{ title: 'Wakacje 2026' }]);
  });

  // specky: crit 01M4TPSB44SA09NE6D546BP4WB
  it('deleting a topic deletes its messages and summaries', async () => {
    await prepareDatabase(db);
    const topicId = await insertTopicWithHistory(db);
    const otherTopicId = await insertTopicWithHistory(db);

    await db.runAsync('DELETE FROM topics WHERE id = ?', [topicId]);

    expect(await db.getAllAsync('SELECT topic_id FROM messages GROUP BY topic_id')).toEqual([
      { topic_id: otherTopicId },
    ]);
    expect(await db.getAllAsync('SELECT topic_id FROM summaries')).toEqual([{ topic_id: otherTopicId }]);
    expect(await db.getFirstAsync('SELECT COUNT(*) AS count FROM summary_templates')).toEqual({ count: 2 });
  });

  it('rejects a message with an unknown role', async () => {
    await prepareDatabase(db);
    const topicId = await insertTopicWithHistory(db);
    await expect(
      db.runAsync('INSERT INTO messages (topic_id, role, content, created_at) VALUES (?, ?, ?, ?)', [
        topicId,
        'system',
        'x',
        1,
      ]),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it('leaves no trace of a migration that fails halfway', async () => {
    const broken = [
      ...MIGRATIONS,
      { version: 2, name: 'broken', up: ['CREATE TABLE extra (id INTEGER)', 'NOT SQL'], down: [] },
    ];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await tableNames(db)).not.toContain('extra');
    expect(await db.getAllAsync('SELECT version FROM schema_migrations')).toEqual([{ version: 1 }]);
  });

  it('refuses migrations whose versions are not consecutive', async () => {
    const gap = [{ ...initialSchema, version: 2 }];
    await expect(migrate(db, gap)).rejects.toThrow(DomainError);
  });

  it('rolls the schema back with down migrations', async () => {
    await migrate(db);
    expect(await rollbackTo(db, 0)).toEqual([1]);
    expect(await tableNames(db)).toEqual(['schema_migrations']);
    expect(await migrate(db)).toEqual([1]);
  });
});

describe('database persistence across app restarts', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'mobivoice-db-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  // specky: crit 01M4TPSB43B3FSN8QSKBQJTABH
  it('topics and messages are available after reopening the database file', async () => {
    const file = join(directory, 'mobivoice.db');
    const firstRun = openNodeSqlDatabase(file);
    await prepareDatabase(firstRun);
    const topicId = await insertTopicWithHistory(firstRun);
    await firstRun.closeAsync();

    const secondRun = openNodeSqlDatabase(file);
    await prepareDatabase(secondRun);
    expect(await secondRun.getAllAsync('SELECT id, title FROM topics')).toEqual([
      { id: topicId, title: 'Wakacje 2026' },
    ]);
    expect(
      await secondRun.getAllAsync('SELECT role, content, interrupted FROM messages ORDER BY created_at'),
    ).toEqual([
      { role: 'user', content: 'Gdzie jechać w lipcu?', interrupted: 0 },
      { role: 'assistant', content: 'Proponuję Mazury', interrupted: 1 },
    ]);
    await secondRun.closeAsync();
  });
});
