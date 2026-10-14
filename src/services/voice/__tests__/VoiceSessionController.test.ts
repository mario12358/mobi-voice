import { AudioSessionService } from '../../../audio/AudioSessionService';
import { FakeAudioPorts } from '../../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { ContextSummaryRepository } from '../../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { encodeWav, synthesize, type AudioPart } from '../../../engines/__tests__/support/audio';
import { EnergyVadEngine } from '../../../engines/fakes/EnergyVadEngine';
import { FakeSttEngine } from '../../../engines/fakes/FakeSttEngine';
import { FakeTtsEngine } from '../../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../../engines/fakes/WavAudioSource';
import type { LlmEngine, LlmRequest, LlmResult } from '../../../engines/types';
import { ContextBuilder } from '../../ContextBuilder';
import { ConversationService } from '../../ConversationService';
import { until } from './support/until';
import { VoiceSessionController, type VoiceState } from '../VoiceSessionController';

// Model driven token by token from the test, so it can look at the voice while the answer is generated.
class SteppedLlm implements LlmEngine {
  readonly requests: LlmRequest[] = [];
  private tokens: string[] = [];
  private step: (() => void) | null = null;

  answerWith(text: string): void {
    this.tokens = text.match(/\S+\s*/g) ?? [];
  }

  generate(request: LlmRequest, onToken: (token: string) => void): Promise<LlmResult> {
    this.requests.push(request);
    let text = '';
    return new Promise((resolve) => {
      this.step = () => {
        const token = this.tokens.shift();
        if (token === undefined) {
          this.step = null;
          resolve({ text, aborted: false });
          return;
        }
        text += token;
        onToken(token);
      };
    });
  }

  get generating(): boolean {
    return this.step !== null;
  }

  next(count = 1): void {
    for (let index = 0; index < count; index += 1) this.step?.();
  }

  finish(): void {
    while (this.step !== null) this.step();
  }
}

describe('VoiceSessionController (continuous mode)', () => {
  let db: SqlDatabase;
  let messages: MessageRepository;
  let topicId: number;
  let llm: SteppedLlm;
  let source: WavAudioSource;
  let stt: FakeSttEngine;
  let tts: FakeTtsEngine;
  let thresholdMs: number;
  let controller: VoiceSessionController;
  let states: VoiceState[];

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    const topics = new TopicRepository(db);
    messages = new MessageRepository(db);
    topicId = (await topics.create('Wakacje')).id;
    llm = new SteppedLlm();
    source = new WavAudioSource();
    stt = new FakeSttEngine();
    tts = new FakeTtsEngine(0);
    thresholdMs = 1_500;
    const vad = new EnergyVadEngine();
    const conversation = new ConversationService({
      topics,
      messages,
      context: new ContextBuilder(messages, new ContextSummaryRepository(db), { summarize: async () => '' }),
      llm: () => llm,
      budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
      systemPrompt: () => 'Odpowiadaj krótko.',
    });
    const ports = new FakeAudioPorts();
    controller = new VoiceSessionController({
      audio: new AudioSessionService({ ...ports, source: () => source, tts: () => tts }),
      vad: () => vad,
      stt: () => stt,
      tts: () => tts,
      conversation,
      silenceThresholdMs: () => thresholdMs,
    });
    states = [];
    await controller.start(topicId, { onState: (state) => states.push(state) });
  });

  afterEach(async () => {
    await controller.stop();
    await db.closeAsync();
  });

  function say(parts: AudioPart[]): void {
    source.enqueueWav(encodeWav(synthesize(parts)));
  }

  // specky: crit 01M4TPSC0B8HYJGGA7VFMDNQMS
  it('sends the utterance with the topic context once silence reaches the threshold, with no tap', async () => {
    await messages.add({ topicId, role: 'user', content: 'Mam tydzień urlopu.' });
    await messages.add({ topicId, role: 'assistant', content: 'Gdzie chcesz jechać?' });
    stt.enqueue('Nad jezioro.');
    llm.answerWith('Proponuję Mazury.');

    say([{ tone: 600 }, { silence: 1_400 }]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(llm.requests).toHaveLength(0);

    say([{ silence: 100 }]);
    await until(() => llm.requests.length === 1);
    expect(llm.requests[0]?.messages).toEqual([
      { role: 'user', content: 'Mam tydzień urlopu.' },
      { role: 'assistant', content: 'Gdzie chcesz jechać?' },
      { role: 'user', content: 'Nad jezioro.' },
    ]);
    llm.finish();
  });

  // specky: crit 01M4TPSC0B4E53VDY3GZ4AXK4A
  it('keeps talking through a pause shorter than the threshold as one utterance', async () => {
    stt.enqueue('Jedziemy nad morze, ale najpierw w góry.');
    llm.answerWith('Dobrze.');

    say([{ tone: 500 }, { silence: 1_000 }, { tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.requests.length === 1);

    expect(stt.segments).toHaveLength(1);
    expect(stt.segments[0]).toMatchObject({ startMs: 0, endMs: 2_000 });
    llm.finish();
  });

  // specky: crit 01M4TPSC0BAH62JP9VCR54D90J
  it('answers in the chat and aloud, then is listening again', async () => {
    stt.enqueue('Gdzie jechać?');
    llm.answerWith('Proponuję Mazury. Jeziora są piękne.');

    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.generating);
    llm.finish();
    await until(() => controller.current === 'listening' && states.length > 1);

    expect(states).toEqual(['listening', 'processing', 'speaking', 'listening']);
    expect(tts.spoken).toEqual(['Proponuję Mazury.', 'Jeziora są piękne.']);
    expect((await messages.listByTopic(topicId)).map((message) => message.content)).toEqual([
      'Gdzie jechać?',
      'Proponuję Mazury. Jeziora są piękne.',
    ]);
  });

  // specky: crit 01M4TPSBQDRJ1KPTAXYXJAQKVQ
  it('starts reading the first sentence while the rest of the answer is still being generated', async () => {
    stt.enqueue('Gdzie jechać?');
    llm.answerWith('Proponuję Mazury. Jeziora są tam naprawdę piękne i czyste.');

    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.generating);
    llm.next(3);
    await until(() => tts.spoken.length === 1);

    expect(tts.spoken).toEqual(['Proponuję Mazury.']);
    expect(llm.generating).toBe(true);
    expect(controller.current).toBe('speaking');
    llm.finish();
  });

  // specky: crit 01M4TPSBQDA2ZHEJR7GGB3Z4DX
  it('reads the answer without Markdown and emoji, while the chat keeps them', async () => {
    const tokens: string[] = [];
    await controller.stop();
    await controller.start(topicId, { onToken: (token) => tokens.push(token) });
    stt.enqueue('Co zabrać?');
    llm.answerWith('**Koniecznie** weź _krem_ 🌞. Miłego wyjazdu!');

    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.generating);
    llm.finish();
    await until(() => tts.spoken.length === 2);

    expect(tts.spoken).toEqual(['Koniecznie weź krem .', 'Miłego wyjazdu!']);
    expect(tokens.join('')).toBe('**Koniecznie** weź _krem_ 🌞. Miłego wyjazdu!');
    expect((await messages.listByTopic(topicId)).at(-1)?.content).toBe(
      '**Koniecznie** weź _krem_ 🌞. Miłego wyjazdu!',
    );
  });

  it('applies a new silence threshold from the next utterance', async () => {
    stt.enqueue('Pierwsze.', 'Drugie.');
    llm.answerWith('Dobrze.');
    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.generating);
    thresholdMs = 3_000;
    llm.finish();
    await until(() => controller.current === 'listening' && states.length > 1);

    llm.answerWith('Jasne.');
    say([{ tone: 500 }, { silence: 2_000 }]);
    await new Promise((resolve) => setImmediate(resolve));
    expect(llm.requests).toHaveLength(1);

    say([{ silence: 1_000 }]);
    await until(() => llm.requests.length === 2);
    llm.finish();
  });

  it('goes back to listening when nothing was recognized', async () => {
    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => stt.segments.length === 1 && controller.current === 'listening');

    expect(llm.requests).toHaveLength(0);
  });

  it('stop() ends the session, the answer and the reading', async () => {
    stt.enqueue('Opowiedz o Mazurach.');
    llm.answerWith('Mazury to kraina jezior. Jest ich ponad dwa tysiące. I wiele więcej.');
    say([{ tone: 500 }, { silence: 1_600 }]);
    await until(() => llm.generating);
    llm.next(5);

    await controller.stop();

    expect(controller.current).toBe('idle');
    expect(tts.isSpeaking).toBe(false);
    expect(source.isRunning).toBe(false);
  });
});
