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
import { FakeKeywordSpotter } from '../../../engines/fakes/FakeKeywordSpotter';
import { FakeSttEngine } from '../../../engines/fakes/FakeSttEngine';
import { FakeTtsEngine } from '../../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../../engines/fakes/WavAudioSource';
import type { LlmEngine, LlmRequest, LlmResult } from '../../../engines/types';
import type { ConversationMode } from '../../../state/settings';
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

  generate(request: LlmRequest, onToken: (token: string) => void, signal: AbortSignal): Promise<LlmResult> {
    this.requests.push(request);
    let text = '';
    return new Promise((resolve) => {
      signal.addEventListener('abort', () => {
        this.step = null;
        resolve({ text, aborted: true });
      });
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
  let spotter: FakeKeywordSpotter;
  let thresholdMs: number;
  let mode: ConversationMode;
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
    spotter = new FakeKeywordSpotter();
    thresholdMs = 1_500;
    mode = 'continuous';
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
      keywordSpotter: () => spotter,
      conversation,
      silenceThresholdMs: () => thresholdMs,
      mode: () => mode,
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
  describe('interrupted mode', () => {
    let heard: string[];

    beforeEach(async () => {
      mode = 'interrupted';
      heard = [];
      await controller.stop();
      states = [];
      await controller.start(topicId, {
        onState: (state) => states.push(state),
        onHeard: (text) => heard.push(text),
      });
    });

    // One part of the utterance followed by a pause; waits until it is recognized and the mic listens again.
    async function speakPart(silenceMs = 2_000): Promise<void> {
      const segments = stt.segments.length;
      say([{ tone: 500 }, { silence: silenceMs }]);
      await until(
        () => stt.segments.length === segments + 1 && (controller.current === 'listening' || llm.generating),
      );
    }

    // specky: crit 01M4TPSC2XBWSY7997NWZGCE5K
    it('does not send on pauses, however long, while "stop" has not been said', async () => {
      stt.enqueue('Planuję wyjazd', 'na Mazury w lipcu', 'z dziećmi');

      await speakPart();
      await speakPart();
      await speakPart(6_000);

      expect(llm.requests).toHaveLength(0);
      expect(heard).toEqual([
        'Planuję wyjazd',
        'Planuję wyjazd na Mazury w lipcu',
        'Planuję wyjazd na Mazury w lipcu z dziećmi',
      ]);
    });

    // specky: crit 01M4TPSC2XMDVW605VXF879XN8
    it('sends everything said so far once the utterance ends with "stop", without the word', async () => {
      stt.enqueue('Planuję wyjazd na Mazury.', 'Co polecasz? Stop.');
      llm.answerWith('Polecam Mikołajki.');

      await speakPart();
      expect(llm.requests).toHaveLength(0);
      await speakPart();
      await until(() => llm.requests.length === 1);

      expect(llm.requests[0]?.messages.at(-1)).toEqual({
        role: 'user',
        content: 'Planuję wyjazd na Mazury. Co polecasz?',
      });
      llm.finish();
      await until(() => controller.current === 'listening' && tts.spoken.length === 1);
      const history = await messages.listByTopic(topicId);
      expect(history.map((message) => message.content)).toEqual([
        'Planuję wyjazd na Mazury. Co polecasz?',
        'Polecam Mikołajki.',
      ]);
    });

    it('treats "stop" in the middle of a sentence as an ordinary word', async () => {
      stt.enqueue('Stop na żądanie przy szkole', 'i co dalej? Stop');
      llm.answerWith('Dobrze.');

      await speakPart();
      expect(heard).toEqual(['Stop na żądanie przy szkole']);
      expect(llm.requests).toHaveLength(0);

      await speakPart();
      await until(() => llm.requests.length === 1);
      expect(llm.requests[0]?.messages.at(-1)?.content).toBe('Stop na żądanie przy szkole i co dalej?');
      llm.finish();
    });
  });
});

describe('VoiceSessionController — "stop"', () => {
  let db: SqlDatabase;
  let messages: MessageRepository;
  let topicId: number;
  let llm: SteppedLlm;
  let source: WavAudioSource;
  let stt: FakeSttEngine;
  let tts: FakeTtsEngine;
  let spotter: FakeKeywordSpotter;
  let controller: VoiceSessionController;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    const topics = new TopicRepository(db);
    messages = new MessageRepository(db);
    topicId = (await topics.create('Mazury')).id;
    llm = new SteppedLlm();
    source = new WavAudioSource();
    stt = new FakeSttEngine();
    tts = new FakeTtsEngine(60_000);
    spotter = new FakeKeywordSpotter();
    const vad = new EnergyVadEngine();
    controller = new VoiceSessionController({
      audio: new AudioSessionService({ ...new FakeAudioPorts(), source: () => source, tts: () => tts }),
      vad: () => vad,
      stt: () => stt,
      tts: () => tts,
      keywordSpotter: () => spotter,
      conversation: new ConversationService({
        topics,
        messages,
        context: new ContextBuilder(messages, new ContextSummaryRepository(db), {
          summarize: async () => '',
        }),
        llm: () => llm,
        budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
        systemPrompt: () => 'Odpowiadaj krótko.',
      }),
      silenceThresholdMs: () => 1_500,
      mode: () => 'continuous',
    });
    await controller.start(topicId);
  });

  afterEach(async () => {
    await controller.stop();
    await db.closeAsync();
  });

  function ask(question: string, answer: string): void {
    stt.enqueue(question);
    llm.answerWith(answer);
    source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
  }

  it('listens for "stop" only while the answer is prepared or read', async () => {
    expect(spotter.isListening).toBe(false);

    ask('Opowiedz o Mazurach.', 'Mazury to kraina jezior. Jest ich ponad dwa tysiące.');
    await until(() => llm.generating);
    expect(spotter.isListening).toBe(true);

    llm.finish();
    await until(() => tts.spoken.length === 2);
    expect(controller.current).toBe('speaking');
    expect(spotter.isListening).toBe(true);

    await tts.stop();
    await until(() => controller.current === 'listening');
    expect(spotter.isListening).toBe(false);
  });

  // specky: crit 01M4TPSC5K3QATGJG1DNDG5JWZ
  it('"stop" while the answer is read silences it and listens at once', async () => {
    ask('Opowiedz o Mazurach.', 'Mazury to kraina jezior. Jest ich ponad dwa tysiące.');
    await until(() => llm.generating);
    llm.finish();
    await until(() => tts.isSpeaking);

    spotter.trigger('stop');

    await until(() => controller.current === 'listening');
    expect(tts.isSpeaking).toBe(false);
    // The rest of the answer is not read after "stop".
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tts.spoken).toEqual(['Mazury to kraina jezior.']);
  });

  // specky: crit 01M4TPSC5K6T07CB28MAEV4VWZ
  it('"stop" while the answer is generated ends the generation and nothing more is read', async () => {
    ask('Opowiedz o Mazurach.', 'Mazury to kraina jezior. Jest ich ponad dwa tysiące. Warto tam pojechać.');
    await until(() => llm.generating);
    llm.next(5);

    spotter.trigger('stop');

    await until(() => !llm.generating && controller.current === 'listening');
    llm.next(10);
    expect(tts.spoken).toEqual(['Mazury to kraina jezior.']);
  });

  // specky: crit 01M4TPSC5KA9NT3SHJ61SKQA26
  it('keeps the interrupted answer in the history, marked, and in the context of the next question', async () => {
    ask('Opowiedz o Mazurach.', 'Mazury to kraina jezior. Jest ich ponad dwa tysiące.');
    await until(() => llm.generating);
    llm.next(5);
    spotter.trigger('stop');
    await until(() => controller.current === 'listening' && !llm.generating);

    let last: Awaited<ReturnType<MessageRepository['listByTopic']>>[number] | undefined;
    await until(() => {
      void messages.listByTopic(topicId).then((history) => (last = history.at(-1)));
      return last?.role === 'assistant';
    });
    expect(last).toMatchObject({ content: 'Mazury to kraina jezior. Jest', interrupted: true });

    ask('A które jest największe?', 'Śniardwy.');
    await until(() => llm.requests.length === 2);
    expect(llm.requests[1]?.messages).toEqual([
      { role: 'user', content: 'Opowiedz o Mazurach.' },
      { role: 'assistant', content: 'Mazury to kraina jezior. Jest' },
      { role: 'user', content: 'A które jest największe?' },
    ]);
    llm.finish();
  });
});
