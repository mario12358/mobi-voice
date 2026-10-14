import type { SqlDatabase } from '../SqlDatabase';

export interface Summary {
  id: number;
  topicId: number;
  // The template it was made with; null for a one-off instruction or a deleted template.
  templateId: number | null;
  content: string;
  createdAt: number;
}

interface SummaryRow {
  id: number;
  topic_id: number;
  template_id: number | null;
  content: string;
  created_at: number;
}

function toSummary(row: SummaryRow): Summary {
  return {
    id: row.id,
    topicId: row.topic_id,
    templateId: row.template_id,
    content: row.content,
    createdAt: row.created_at,
  };
}

// Summaries kept with their topic (MV-SUM-1); regenerating adds a newer one.
export class SummaryRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  async add(topicId: number, templateId: number | null, content: string): Promise<Summary> {
    const createdAt = this.now();
    const result = await this.db.runAsync(
      'INSERT INTO summaries (topic_id, template_id, content, created_at) VALUES (?, ?, ?, ?)',
      [topicId, templateId, content, createdAt],
    );
    return { id: result.lastInsertRowId, topicId, templateId, content, createdAt };
  }

  async latest(topicId: number): Promise<Summary | null> {
    const row = await this.db.getFirstAsync<SummaryRow>(
      'SELECT id, topic_id, template_id, content, created_at FROM summaries WHERE topic_id = ? ORDER BY id DESC LIMIT 1',
      [topicId],
    );
    return row === null ? null : toSummary(row);
  }

  // The template of the newest summary in any topic: "summarize" by voice reuses it (MV-SUM-1).
  async lastUsedTemplateId(): Promise<number | null> {
    const row = await this.db.getFirstAsync<{ template_id: number | null }>(
      'SELECT template_id FROM summaries WHERE template_id IS NOT NULL ORDER BY id DESC LIMIT 1',
    );
    return row?.template_id ?? null;
  }
}
