import { EnergyVadEngine } from '../fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from '../fakes/FakeKeywordSpotter';
import { FakeLlmEngine } from '../fakes/FakeLlmEngine';
import { FakeSttEngine } from '../fakes/FakeSttEngine';
import { FakeTtsEngine } from '../fakes/FakeTtsEngine';
import { WavAudioSource } from '../fakes/WavAudioSource';
import type { AudioChunk, LlmRequest, VadEvent } from '../types';
import { encodeWav, synthesize } from './support/audio';

const REQUEST: LlmRequest = {
  systemPrompt: 'Odpowiadaj krótko',
  messages: [{ role: 'user', content: 'Jaka jest pogoda?' }],
};

describe('FakeLlmEngine', () => {
  it('streams tokens that add up to the final text', async () => {
    const llm = new FakeLlmEngine(() => 'Jest słonecznie. Weź okulary.');
    const tokens: string[] = [];

    const result = await llm.generate(REQUEST, (token) => tokens.push(token), new AbortController().signal);

    expect(tokens).toEqual(['Jest ', 'słonecznie. ', 'Weź ', 'okulary.']);
    expect(result).toEqual({ text: 'Jest słonecznie. Weź okulary.', aborted: false });
    expect(llm.requests).toEqual([REQUEST]);
  });

  it('stops on abort and returns the text generated so far', async () => {
    const llm = new FakeLlmEngine(() => 'Raz dwa trzy cztery pięć');
    const controller = new AbortController();
    const tokens: string[] = [];

    const result = await llm.generate(
      REQUEST,
      (token) => {
        tokens.push(token);
        if (tokens.length === 2) controller.abort();
      },
      controller.signal,
    );

    expect(result).toEqual({ text: 'Raz dwa ', aborted: true });
    expect(tokens).toHaveLength(2);
  });

  it('echoes the last user message by default', async () => {
    const result = await new FakeLlmEngine().generate(REQUEST, () => undefined, new AbortController().signal);
    expect(result.text).toContain('Jaka jest pogoda?');
  });
});

describe('FakeTtsEngine', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('finishes speaking after the speech duration', async () => {
    const tts = new FakeTtsEngine(1_000);
    let finished = false;
    const speaking = tts.speak('Dzień dobry.').then(() => (finished = true));

    await jest.advanceTimersByTimeAsync(999);
    expect(finished).toBe(false);
    expect(tts.isSpeaking).toBe(true);
    await jest.advanceTimersByTimeAsync(1);
    await speaking;
    expect(tts.spoken).toEqual(['Dzień dobry.']);
    expect(tts.isSpeaking).toBe(false);
  });

  it('stop ends playback immediately', async () => {
    const tts = new FakeTtsEngine(60_000);
    const speaking = tts.speak('Długi wywód.');

    await tts.stop();
    await speaking;

    expect(tts.isSpeaking).toBe(false);
  });
});

function runVad(vad: EnergyVadEngine, audio: AudioChunk, chunkMs = 100): VadEvent[] {
  const chunkLength = (audio.sampleRate * chunkMs) / 1000;
  const events: VadEvent[] = [];
  for (let start = 0; start < audio.samples.length; start += chunkLength) {
    events.push(
      ...vad.process({
        samples: audio.samples.subarray(start, start + chunkLength),
        sampleRate: audio.sampleRate,
      }),
    );
  }
  return events;
}

describe('EnergyVadEngine', () => {
  const utterance = synthesize([
    { silence: 500 },
    { tone: 1_000 },
    { silence: 1_000 },
    { tone: 500 },
    { silence: 3_200 },
  ]);

  it('ends an utterance only after silence reaches the threshold', () => {
    const vad = new EnergyVadEngine();
    vad.setSilenceThresholdMs(3_000);

    const events = runVad(vad, utterance);

    expect(events.map((event) => event.type)).toEqual(['speech_start', 'speech_end']);
    const end = events[1];
    if (end?.type !== 'speech_end') throw new Error('expected speech_end');
    expect(end.segment.startMs).toBe(500);
    expect(end.segment.endMs).toBe(3_000);
  });

  it('splits on shorter pauses when the threshold is lower', () => {
    const vad = new EnergyVadEngine();
    vad.setSilenceThresholdMs(800);

    const ends = runVad(vad, utterance).filter((event) => event.type === 'speech_end');

    expect(ends).toHaveLength(2);
  });

  it('emits nothing for silence and resets between sessions', () => {
    const vad = new EnergyVadEngine();
    expect(runVad(vad, synthesize([{ silence: 5_000 }]))).toEqual([]);
    runVad(vad, synthesize([{ tone: 300 }]));
    vad.reset();
    expect(runVad(vad, synthesize([{ silence: 4_000 }]))).toEqual([]);
  });
});

describe('WavAudioSource with VAD and STT fakes', () => {
  it('turns an injected WAV file into one transcribed speech segment', async () => {
    const source = new WavAudioSource();
    const vad = new EnergyVadEngine();
    const stt = new FakeSttEngine(['Przełącz na temat wakacje']);
    vad.setSilenceThresholdMs(1_500);
    const segments: VadEvent[] = [];

    source.enqueueWav(encodeWav(synthesize([{ tone: 800 }, { silence: 2_000 }])));
    expect(source.isRunning).toBe(false);
    await source.start((chunk) => segments.push(...vad.process(chunk)));

    const end = segments.find((event) => event.type === 'speech_end');
    if (end?.type !== 'speech_end') throw new Error('expected speech_end');
    expect(await stt.transcribe(end.segment)).toBe('Przełącz na temat wakacje');
    expect(await stt.transcribe(end.segment)).toBe('');
  });
});

describe('FakeKeywordSpotter', () => {
  it('reports the keyword only while listening', async () => {
    const spotter = new FakeKeywordSpotter();
    const heard: string[] = [];

    expect(spotter.trigger()).toBe(false);
    await spotter.start((keyword) => heard.push(keyword));
    expect(spotter.trigger('stop')).toBe(true);
    await spotter.stop();
    spotter.trigger();

    expect(heard).toEqual(['stop']);
  });
});
