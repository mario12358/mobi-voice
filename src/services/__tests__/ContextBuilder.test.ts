import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { ContextSummaryRepository } from '../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import type { ChatMessage } from '../../engines/types';
import { FakeLlmEngine } from '../../engines/fakes/FakeLlmEngine';
import { llmEntries } from '../../models/catalog';
import { ContextBuilder, LlmSummarizer, type ModelBudget, type Summarizer } from '../ContextBuilder';
import { CONTEXT_SUMMARY_HEADER } from '../prompts';
import { estimateMessageTokens, estimateSystemTokens } from '../tokens';

const LOCAL = llmEntries()[0] as ModelBudget;
const CLOUD: ModelBudget = { contextTokens: 128_000, maxOutputTokens: 1_024 };
const SYSTEM = 'Odpowiadaj zwięźle po polsku.';

class RecordingSummarizer implements Summarizer {
  readonly calls: { previous: string | null; messages: ChatMessage[]; maxTokens: number }[] = [];

  async summarize(previous: string | null, messages: ChatMessage[], maxTokens: number): Promise<string> {
    this.calls.push({ previous, messages, maxTokens });
    return `Streszczenie nr ${this.calls.length}: ${messages.length} wiadomości`;
  }
}

function sentence(index: number): string {
  return (
    `Wiadomość ${index}: ` + 'Planujemy wyjazd nad morze i rozważamy różne terminy oraz noclegi. '.repeat(6)
  );
}

describe('ContextBuilder', () => {
  let db: SqlDatabase;
  let topicId: number;
  let messages: MessageRepository;
  let summarizer: RecordingSummarizer;
  let builder: ContextBuilder;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1);
    topicId = (await new TopicRepository(db, clock).create('Wakacje')).id;
    messages = new MessageRepository(db, clock);
    summarizer = new RecordingSummarizer();
    builder = new ContextBuilder(messages, new ContextSummaryRepository(db, clock), summarizer);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function addConversation(count: number) {
    for (let index = 1; index <= count; index += 1) {
      await messages.add({ topicId, role: index % 2 === 1 ? 'user' : 'assistant', content: sentence(index) });
    }
  }

  it('sends the whole short conversation in order, without a summary', async () => {
    await addConversation(4);

    const context = await builder.build(topicId, SYSTEM, LOCAL);

    expect(context.summaryUsed).toBe(false);
    expect(context.request.systemPrompt).toBe(SYSTEM);
    expect(context.request.messages.map((message) => message.content)).toEqual([1, 2, 3, 4].map(sentence));
    expect(context.request.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);
    expect(summarizer.calls).toEqual([]);
  });

  // specky: crit 01M4TPSBSQMMJJXSTTVE150DAW
  it('keeps the context sent to a local model within its token budget', async () => {
    await addConversation(120);

    const context = await builder.build(topicId, SYSTEM, LOCAL);

    const tokens =
      estimateSystemTokens(context.request.systemPrompt) +
      context.request.messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
    expect(tokens).toBe(context.estimatedTokens);
    expect(tokens).toBeLessThanOrEqual(LOCAL.contextTokens - LOCAL.maxOutputTokens);
    expect(context.request.messages.at(-1)?.content).toBe(sentence(120));
    expect(await messages.listByTopic(topicId)).toHaveLength(120);
  });

  // specky: crit 01M4TPSBSQR8MDHPK0NX5E7WCM
  it('adds a summary of the older part when the history exceeds the budget', async () => {
    await addConversation(120);

    const context = await builder.build(topicId, SYSTEM, LOCAL);

    expect(context.summaryUsed).toBe(true);
    expect(context.request.systemPrompt).toContain(SYSTEM);
    expect(context.request.systemPrompt).toContain(CONTEXT_SUMMARY_HEADER);
    const firstIncluded = context.includedMessageIds[0] ?? 0;
    expect(summarizer.calls).toHaveLength(1);
    expect(summarizer.calls[0]?.messages).toHaveLength(firstIncluded - 1);
    expect(context.request.systemPrompt).toContain(`${firstIncluded - 1} wiadomości`);
  });

  it('reuses the stored summary and only summarises messages it does not cover yet', async () => {
    await addConversation(120);
    await builder.build(topicId, SYSTEM, LOCAL);
    expect(await builder.build(topicId, SYSTEM, LOCAL)).toMatchObject({ summaryUsed: true });
    expect(summarizer.calls).toHaveLength(1);

    for (let index = 121; index <= 140; index += 1) {
      await messages.add({ topicId, role: 'user', content: sentence(index) });
    }
    await builder.build(topicId, SYSTEM, LOCAL);

    expect(summarizer.calls).toHaveLength(2);
    expect(summarizer.calls[1]?.previous).toBe(
      `Streszczenie nr 1: ${summarizer.calls[0]?.messages.length} wiadomości`,
    );
    expect(summarizer.calls[1]?.messages.length).toBeLessThan(25);
  });

  // specky: crit 01M4TPSBSQ1783VCEV6RBY62XS
  it('sends the whole history to a cloud model with a large budget', async () => {
    await addConversation(120);

    const context = await builder.build(topicId, SYSTEM, CLOUD);

    expect(context.summaryUsed).toBe(false);
    expect(context.request.messages).toHaveLength(120);
    expect(summarizer.calls).toEqual([]);
  });

  it('always sends the latest message, clipped from the front if it alone is too long', async () => {
    await messages.add({
      topicId,
      role: 'user',
      content: 'początek ' + 'x'.repeat(20_000) + ' koniec pytania',
    });

    const context = await builder.build(topicId, null, LOCAL);

    const latest = context.request.messages.at(-1)?.content ?? '';
    expect(latest.endsWith('koniec pytania')).toBe(true);
    expect(context.estimatedTokens).toBeLessThanOrEqual(LOCAL.contextTokens - LOCAL.maxOutputTokens);
  });

  it('summarises with the LLM using the Polish summarizer prompt', async () => {
    const llm = new FakeLlmEngine(() => '• Wybrano Mazury.');
    const summary = await new LlmSummarizer(llm).summarize(
      '• Wcześniej: morze.',
      [{ role: 'user', content: 'Jedźmy na Mazury' }],
      200,
    );

    expect(summary).toBe('• Wybrano Mazury.');
    expect(llm.requests[0]?.maxTokens).toBe(200);
    expect(llm.requests[0]?.messages[0]?.content).toContain(
      'Dotychczasowe streszczenie:\n• Wcześniej: morze.',
    );
  });
});
