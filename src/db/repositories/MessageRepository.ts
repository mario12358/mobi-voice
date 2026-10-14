import { DomainError } from '../../core/errors';
import type { SqlDatabase } from '../SqlDatabase';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: number;
  topicId: number;
  role: MessageRole;
  content: string;
  createdAt: number;
  interrupted: boolean;
}

export interface NewMessage {
  topicId: number;
  role: MessageRole;
  content: string;
  interrupted?: boolean;
}

interface MessageRow {
  id: number;
  topic_id: number;
  role: MessageRole;
  content: string;
  created_at: number;
  interrupted: number;
}

const MESSAGE_COLUMNS = 'id, topic_id, role, content, created_at, interrupted';

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    topicId: row.topic_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    interrupted: row.interrupted === 1,
  };
}

export class MessageRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  async add(message: NewMessage): Promise<Message> {
    const createdAt = this.now();
    let messageId = 0;
    await this.db.withTransactionAsync(async () => {
      const touched = await this.db.runAsync('UPDATE topics SET last_activity_at = ? WHERE id = ?', [
        createdAt,
        message.topicId,
      ]);
      if (touched.changes === 0) throw new DomainError('topic_not_found', `Topic ${message.topicId}`);
      const inserted = await this.db.runAsync(
        'INSERT INTO messages (topic_id, role, content, created_at, interrupted) VALUES (?, ?, ?, ?, ?)',
        [message.topicId, message.role, message.content, createdAt, message.interrupted ? 1 : 0],
      );
      messageId = inserted.lastInsertRowId;
    });
    return { ...message, id: messageId, createdAt, interrupted: message.interrupted ?? false };
  }

  async listByTopic(topicId: number): Promise<Message[]> {
    const rows = await this.db.getAllAsync<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE topic_id = ? ORDER BY created_at, id`,
      [topicId],
    );
    return rows.map(toMessage);
  }

  // A spoken command the model recognized is not part of the conversation (MV-CMD-1).
  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
  }
}
