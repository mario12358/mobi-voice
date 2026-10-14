import type { ApiKeyStore } from '../cloud/createCloudEngines';
import type { Message, MessageRepository } from '../db/repositories/MessageRepository';
import type { Topic, TopicRepository } from '../db/repositories/TopicRepository';
import { DomainError } from '../core/errors';
import { pl } from '../i18n/pl';
import { CLOUD_PROVIDERS } from '../state/SecretStore';

export interface TopicExport {
  title: string;
  markdown: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });

function messageBlock(message: Message, formatDate: (at: number) => string): string {
  const role = message.role === 'user' ? pl.topicExport.user : pl.topicExport.assistant;
  const interrupted = message.interrupted ? ` ${pl.topicExport.interrupted}` : '';
  return `**${role}** · ${formatDate(message.createdAt)}${interrupted}\n\n${message.content}`;
}

export function topicMarkdown(
  topic: Topic,
  messages: Message[],
  exportedAt: number,
  formatDate: (at: number) => string = (at) => DATE_FORMAT.format(new Date(at)),
): string {
  const body =
    messages.length === 0
      ? pl.topicExport.empty
      : messages.map((message) => messageBlock(message, formatDate)).join('\n\n---\n\n');
  return `# ${topic.title}\n\n_${pl.topicExport.exportedAt(formatDate(exportedAt))}_\n\n${body}\n`;
}

// The topic history as Markdown for the system share sheet (MV-SUM-2). API keys never leave the
// app: a saved key pasted into the conversation is blanked out in the export.
export class TopicExporter {
  constructor(
    private readonly topics: TopicRepository,
    private readonly messages: MessageRepository,
    private readonly apiKeys: ApiKeyStore,
    private readonly now: () => number = Date.now,
  ) {}

  async export(topicId: number): Promise<TopicExport> {
    const topic = await this.topics.getById(topicId);
    if (topic === null) throw new DomainError('topic_not_found', `Topic ${topicId}`);
    const [messages, keys] = await Promise.all([
      this.messages.listByTopic(topicId),
      Promise.all(CLOUD_PROVIDERS.map((provider) => this.apiKeys.getApiKey(provider))),
    ]);
    let markdown = topicMarkdown(topic, messages, this.now());
    for (const key of keys) {
      if (key !== null && key.length > 0) markdown = markdown.split(key).join(pl.topicExport.keyRemoved);
    }
    return { title: topic.title, markdown };
  }
}
