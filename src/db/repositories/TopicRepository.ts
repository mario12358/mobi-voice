import { DomainError } from '../../core/errors';
import type { SqlDatabase } from '../SqlDatabase';

export interface Topic {
  id: number;
  title: string;
  createdAt: number;
  lastActivityAt: number;
  systemPrompt: string | null;
  modelOverride: string | null;
}

interface TopicRow {
  id: number;
  title: string;
  created_at: number;
  last_activity_at: number;
  system_prompt: string | null;
  model_override: string | null;
}

const TOPIC_COLUMNS = 'id, title, created_at, last_activity_at, system_prompt, model_override';

function toTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    systemPrompt: row.system_prompt,
    modelOverride: row.model_override,
  };
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) throw new DomainError('empty_title');
  return trimmed;
}

function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}

export class TopicRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  async create(title: string): Promise<Topic> {
    const createdAt = this.now();
    const result = await this.db.runAsync(
      'INSERT INTO topics (title, created_at, last_activity_at) VALUES (?, ?, ?)',
      [normalizeTitle(title), createdAt, createdAt],
    );
    return this.require(result.lastInsertRowId);
  }

  async getById(id: number): Promise<Topic | null> {
    const row = await this.db.getFirstAsync<TopicRow>(`SELECT ${TOPIC_COLUMNS} FROM topics WHERE id = ?`, [
      id,
    ]);
    return row === null ? null : toTopic(row);
  }

  async listByLastActivity(): Promise<Topic[]> {
    const rows = await this.db.getAllAsync<TopicRow>(
      `SELECT ${TOPIC_COLUMNS} FROM topics ORDER BY last_activity_at DESC, id DESC`,
      [],
    );
    return rows.map(toTopic);
  }

  // SQLite LIKE/lower() fold only ASCII, so Polish titles are matched in JS.
  async searchByTitle(query: string): Promise<Topic[]> {
    const needle = query.trim().toLocaleLowerCase('pl');
    const topics = await this.listByLastActivity();
    if (needle.length === 0) return topics;
    return topics.filter((topic) => topic.title.toLocaleLowerCase('pl').includes(needle));
  }

  async rename(id: number, title: string): Promise<Topic> {
    await this.update(id, 'UPDATE topics SET title = ? WHERE id = ?', [normalizeTitle(title), id]);
    return this.require(id);
  }

  async setSystemPrompt(id: number, systemPrompt: string | null): Promise<Topic> {
    await this.update(id, 'UPDATE topics SET system_prompt = ? WHERE id = ?', [
      emptyToNull(systemPrompt),
      id,
    ]);
    return this.require(id);
  }

  async setModelOverride(id: number, modelId: string | null): Promise<Topic> {
    await this.update(id, 'UPDATE topics SET model_override = ? WHERE id = ?', [emptyToNull(modelId), id]);
    return this.require(id);
  }

  async delete(id: number): Promise<void> {
    await this.update(id, 'DELETE FROM topics WHERE id = ?', [id]);
  }

  private async update(id: number, source: string, params: (string | number | null)[]): Promise<void> {
    const result = await this.db.runAsync(source, params);
    if (result.changes === 0) throw new DomainError('topic_not_found', `Topic ${id}`);
  }

  private async require(id: number): Promise<Topic> {
    const topic = await this.getById(id);
    if (topic === null) throw new DomainError('topic_not_found', `Topic ${id}`);
    return topic;
  }
}
