import type { Migration } from './Migration';

export const initialSchema: Migration = {
  version: 1,
  name: 'initial_schema',
  up: [
    `CREATE TABLE topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_activity_at INTEGER NOT NULL,
      system_prompt TEXT,
      model_override TEXT
    )`,
    'CREATE INDEX idx_topics_last_activity_at ON topics (last_activity_at)',
    `CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      interrupted INTEGER NOT NULL DEFAULT 0 CHECK (interrupted IN (0, 1))
    )`,
    'CREATE INDEX idx_messages_topic_id_created_at ON messages (topic_id, created_at)',
    `CREATE TABLE summary_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      instruction TEXT NOT NULL,
      is_builtin INTEGER NOT NULL DEFAULT 0 CHECK (is_builtin IN (0, 1)),
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
      template_id INTEGER REFERENCES summary_templates (id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    'CREATE INDEX idx_summaries_topic_id ON summaries (topic_id)',
    'CREATE INDEX idx_summaries_template_id ON summaries (template_id)',
  ],
  down: ['DROP TABLE summaries', 'DROP TABLE summary_templates', 'DROP TABLE messages', 'DROP TABLE topics'],
};
