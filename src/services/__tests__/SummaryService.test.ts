import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { SummaryRepository } from '../../db/repositories/SummaryRepository';
import { SummaryTemplateRepository } from '../../db/repositories/SummaryTemplateRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import type { LlmEngine, LlmRequest, LlmResult } from '../../engines/types';
import type { ModelBudget } from '../ContextBuilder';
import { PART_NOTES_INSTRUCTION, SummaryCancelledError, SummaryService } from '../SummaryService';
import { SUMMARY_SYSTEM_PROMPT } from '../prompts';
import { estimateTextTokens } from '../tokens';

const SMALL: ModelBudget = { contextTokens: 2_048, maxOutputTokens: 256 };
const LARGE: ModelBudget = { contextTokens: 128_000, maxOutputTokens: 1_024 };

// Notes repeat the facts (the markers) found in the text, the way a model would.
class RecordingLlm implements LlmEngine {
  readonly requests: LlmRequest[] = [];

  async generate(request: LlmRequest): Promise<LlmResult> {
    this.requests.push(request);
    const prompt = request.messages[0]?.content ?? '';
    const facts = prompt.match(/FAKT-\d+/g) ?? [];
    const answer = prompt.startsWith(PART_NOTES_INSTRUCTION)
      ? facts.join(' ')
      : `Podsumowanie: ${facts.join(' ')}`;
    return { text: ` ${answer} `, aborted: false };
  }
}

// A model that writes far more than it was allowed to.
class VerboseLlm extends RecordingLlm {
  override async generate(request: LlmRequest): Promise<LlmResult> {
    this.requests.push(request);
    return { text: 'bardzo długa notatka '.repeat(2_000), aborted: false };
  }
}

function sentence(index: number): string {
  return `FAKT-${index} ` + 'Ustalamy szczegóły wyjazdu, terminy, noclegi i koszty podróży. '.repeat(5);
}

describe('SummaryService', () => {
  let db: SqlDatabase;
  let topicId: number;
  let messages: MessageRepository;
  let llm: RecordingLlm;
  let budget: ModelBudget;
  let service: SummaryService;
  let templates: SummaryTemplateRepository;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1);
    const topics = new TopicRepository(db, clock);
    topicId = (await topics.create('Wakacje')).id;
    messages = new MessageRepository(db, clock);
    llm = new RecordingLlm();
    budget = LARGE;
    templates = new SummaryTemplateRepository(db, clock);
    service = new SummaryService({
      topics,
      messages,
      summaries: new SummaryRepository(db, clock),
      templates,
      llm: () => llm,
      budget: () => budget,
      model: () => 'cloud:openai:gpt-4o-mini',
    });
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function addConversation(count: number) {
    for (let index = 1; index <= count; index += 1) {
      await messages.add({ topicId, role: index % 2 === 1 ? 'user' : 'assistant', content: sentence(index) });
    }
  }

  it('summarizes a short topic in one request, in the form of the chosen template', async () => {
    await addConversation(4);
    const note = (await templates.list())[0]!;

    const summary = await service.generate(topicId, { instruction: note.instruction, templateId: note.id });

    expect(llm.requests).toHaveLength(1);
    const request = llm.requests[0]!;
    expect(request.systemPrompt).toBe(SUMMARY_SYSTEM_PROMPT);
    expect(request.model).toBe('cloud:openai:gpt-4o-mini');
    expect(request.messages[0]!.content.startsWith(note.instruction)).toBe(true);
    expect(request.messages[0]!.content).toContain(`Użytkownik: ${sentence(1)}`);
    expect(request.messages[0]!.content).toContain(`Asystent: ${sentence(2)}`);
    expect(summary).toMatchObject({
      topicId,
      templateId: note.id,
      content: 'Podsumowanie: FAKT-1 FAKT-2 FAKT-3 FAKT-4',
    });
  });

  // specky: crit 01M4TPSDBQ5F5ZY4NE2YVGSA2C
  it('covers the whole history even when it is many times larger than the model context', async () => {
    budget = SMALL;
    await addConversation(120);
    const history = (await messages.listByTopic(topicId)).map((message) => message.content).join('\n');
    expect(estimateTextTokens(history)).toBeGreaterThan(SMALL.contextTokens * 5);

    const summary = await service.generate(topicId, { instruction: 'Lista zadań.', templateId: null });

    // Every request fits the small model: prompt plus the answer it may write.
    for (const request of llm.requests) {
      const prompt = estimateTextTokens(request.systemPrompt! + request.messages[0]!.content);
      expect(prompt + request.maxTokens!).toBeLessThanOrEqual(SMALL.contextTokens);
    }
    // Every message reached the model, in order, and its facts survive into the final summary.
    const facts = Array.from({ length: 120 }, (_, index) => `FAKT-${index + 1}`);
    expect(summary.content).toBe(`Podsumowanie: ${facts.join(' ')}`);
    expect(llm.requests.length).toBeGreaterThan(2);
    expect(llm.requests.at(-1)!.messages[0]!.content.startsWith('Lista zadań.')).toBe(true);
  });

  // specky: crit 01M4TPSDBQ2SFHKYMWB8NQJ2MT
  it('keeps the summary with its topic and makes a new one on regenerate', async () => {
    await addConversation(2);
    const first = await service.generate(topicId, { instruction: 'Notatka.', templateId: null });
    await addConversation(4);

    const second = await service.generate(topicId, { instruction: 'Notatka.', templateId: null });

    expect(second.id).not.toBe(first.id);
    expect(second.content).toContain('FAKT-4');
    expect(await service.latest(topicId)).toEqual(second);
    const kept = await db.getAllAsync<{ topic_id: number }>('SELECT topic_id FROM summaries ORDER BY id');
    expect(kept).toEqual([{ topic_id: topicId }, { topic_id: topicId }]);
  });

  it('remembers the template used last, for "summarize" by voice', async () => {
    const summaries = new SummaryRepository(db);
    const [, points, tasks] = await templates.list();
    expect(await summaries.lastUsedTemplateId()).toBeNull();

    await summaries.add(topicId, points!.id, 'a');
    await summaries.add(topicId, tasks!.id, 'b');
    await summaries.add(topicId, null, 'c');

    expect(await summaries.lastUsedTemplateId()).toBe(tasks!.id);
  });

  it('summarizes in the form used last, or in the first built-in one before any summary', async () => {
    await addConversation(2);
    const [note, , tasks] = await templates.list();

    const first = await service.generateInLastForm(topicId);
    expect(first.templateId).toBe(note!.id);
    expect(llm.requests.at(-1)!.messages[0]!.content.startsWith(note!.instruction)).toBe(true);

    await service.generate(topicId, { instruction: tasks!.instruction, templateId: tasks!.id });
    const again = await service.generateInLastForm(topicId);
    expect(again.templateId).toBe(tasks!.id);
    expect(llm.requests.at(-1)!.messages[0]!.content.startsWith(tasks!.instruction)).toBe(true);
  });

  it('refuses a topic that does not exist', async () => {
    await expect(service.generate(999, { instruction: 'Notatka.', templateId: null })).rejects.toMatchObject({
      code: 'topic_not_found',
    });
  });

  it('stops cutting into notes when the model ignores the length limit', async () => {
    budget = SMALL;
    await addConversation(60);
    llm = new VerboseLlm();

    const summary = await service.generate(topicId, { instruction: 'Notatka.', templateId: null });

    expect(summary.content.length).toBeGreaterThan(0);
    expect(llm.requests.length).toBeLessThan(200);
  });

  it('saves nothing when the generation is stopped', async () => {
    budget = SMALL;
    await addConversation(60);
    const stop = new AbortController();
    llm = new (class extends RecordingLlm {
      override async generate(request: LlmRequest): Promise<LlmResult> {
        if (this.requests.length === 1) stop.abort();
        return super.generate(request);
      }
    })();

    await expect(
      service.generate(topicId, { instruction: 'Notatka.', templateId: null }, stop.signal),
    ).rejects.toBeInstanceOf(SummaryCancelledError);

    expect(llm.requests).toHaveLength(2);
    expect(await service.latest(topicId)).toBeNull();
  });

  it('removes the summaries together with their topic', async () => {
    await addConversation(2);
    await service.generate(topicId, { instruction: 'Notatka.', templateId: null });

    await new TopicRepository(db).delete(topicId);

    expect(await service.latest(topicId)).toBeNull();
  });
});
