import type { SqlDatabase } from '../SqlDatabase';

export interface ContextSummary {
  topicId: number;
  content: string;
  // Id of the newest message the summary already covers.
  coversUntilMessageId: number;
  updatedAt: number;
}

interface ContextSummaryRow {
  topic_id: number;
  content: string;
  covers_until_message_id: number;
  updated_at: number;
}

export class ContextSummaryRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  async get(topicId: number): Promise<ContextSummary | null> {
    const row = await this.db.getFirstAsync<ContextSummaryRow>(
      'SELECT topic_id, content, covers_until_message_id, updated_at FROM context_summaries WHERE topic_id = ?',
      [topicId],
    );
    if (row === null) return null;
    return {
      topicId: row.topic_id,
      content: row.content,
      coversUntilMessageId: row.covers_until_message_id,
      updatedAt: row.updated_at,
    };
  }

  async save(topicId: number, content: string, coversUntilMessageId: number): Promise<ContextSummary> {
    const updatedAt = this.now();
    await this.db.runAsync(
      `INSERT INTO context_summaries (topic_id, content, covers_until_message_id, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (topic_id) DO UPDATE SET content = excluded.content,
         covers_until_message_id = excluded.covers_until_message_id, updated_at = excluded.updated_at`,
      [topicId, content, coversUntilMessageId, updatedAt],
    );
    return { topicId, content, coversUntilMessageId, updatedAt };
  }
}
