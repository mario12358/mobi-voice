import type { Migration } from './Migration';

// Rolling summary of the part of a topic that no longer fits the model context (S1, MV-CHAT-2).
// Separate from `summaries`, which hold the summaries the user asks for (phase 8).
export const contextSummaries: Migration = {
  version: 2,
  name: 'context_summaries',
  up: [
    `CREATE TABLE context_summaries (
      topic_id INTEGER PRIMARY KEY REFERENCES topics (id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      covers_until_message_id INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ],
  down: ['DROP TABLE context_summaries'],
};
