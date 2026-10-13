import type { Migration } from './Migration';

// Where a topic title comes from: the default placeholder, the LLM (MV-TOP-3) or the user.
export const topicTitleSource: Migration = {
  version: 3,
  name: 'topic_title_source',
  up: [
    `ALTER TABLE topics ADD COLUMN title_source TEXT NOT NULL DEFAULT 'manual'
      CHECK (title_source IN ('default', 'auto', 'manual'))`,
    // Topics created before this migration with the app's placeholder title still await an automatic one.
    "UPDATE topics SET title_source = 'default' WHERE title = 'Nowa rozmowa'",
  ],
  down: ['ALTER TABLE topics DROP COLUMN title_source'],
};
