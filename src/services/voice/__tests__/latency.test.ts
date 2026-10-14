import { AudioSessionService } from '../../../audio/AudioSessionService';
import { FakeAudioPorts } from '../../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { ContextSummaryRepository } from '../../../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { encodeWav, synthesize } from '../../../engines/__tests__/support/audio';
import { EnergyVadEngine } from '../../../engines/fakes/EnergyVadEngine';
import { WavAudioSource } from '../../../engines/fakes/WavAudioSource';
import type { LlmEngine, SpeechSegment, SttEngine, TtsEngine } from '../../../engines/types';
import type { LatencySample } from '../../../state/latency';
import { ContextBuilder } from '../../ContextBuilder';
import { ConversationService } from '../../ConversationService';
import { until } from './support/until';
import { VoiceSessionController } from '../VoiceSessionController';

// Engines that take a set amount of (simulated) time, so the measured latencies are known exactly.
function slowEngines(clock: { now: number }, delays: { stt: number; firstToken: number; synthesis: number }) {
  const stt: SttEngine = {
    transcribe: async (_segment: SpeechSegment) => {
      clock.now += delays.stt;
      return 'Gdzie jechać?';
    },
    release: async () => {},
  };
  const llm: LlmEngine = {
    // First token after the given delay, then one token every 100 ms.
    generate: async (_request, onToken) => {
      const tokens = ['Proponuję ', 'Mazury. ', 'Jeziora ', 'są ', 'piękne.'];
      clock.now += delays.firstToken - 100;
      for (const token of tokens) {
        clock.now += 100;
        onToken(token);
      }
      return { text: tokens.join(''), aborted: false };
    },
  };
  const tts: TtsEngine = {
    beginAnswer: () => {},
    // The first sentence becomes audible after its synthesis time.
    speak: async (_text, onStart) => {
      clock.now += delays.synthesis;
      onStart?.();
    },
    stop: async () => {},
  };
  return { stt, llm, tts };
}

describe('voice latency metrics', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('measures STT, first token and first audio from the end of the utterance', async () => {
    const clock = { now: 10_000 };
    const { stt, llm, tts } = slowEngines(clock, { stt: 800, firstToken: 1_200, synthesis: 300 });
    const topics = new TopicRepository(db);
    const messages = new MessageRepository(db);
    const topicId = (await topics.create('Wakacje')).id;
    const recorded: LatencySample[] = [];
    const source = new WavAudioSource();
    const vad = new EnergyVadEngine();
    const controller = new VoiceSessionController({
      audio: new AudioSessionService({ ...new FakeAudioPorts(), source: () => source, tts: () => tts }),
      vad: () => vad,
      stt: () => stt,
      tts: () => tts,
      conversation: new ConversationService({
        topics,
        messages,
        context: new ContextBuilder(messages, new ContextSummaryRepository(db), {
          summarize: async () => '',
        }),
        llm: () => llm,
        budget: () => ({ contextTokens: 4_096, maxOutputTokens: 512 }),
        systemPrompt: () => null,
      }),
      silenceThresholdMs: () => 1_500,
      recordLatency: (sample) => recorded.push(sample),
      now: () => clock.now,
    });

    await controller.start(topicId);
    source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
    await until(() => recorded.length === 1);

    // The first sentence is complete when the next word starts (+200 ms), then takes 300 ms to synthesize.
    expect(recorded[0]).toEqual({ at: 10_000, sttMs: 800, firstTokenMs: 2_000, firstAudioMs: 2_500 });
    await controller.stop();
  });
});
