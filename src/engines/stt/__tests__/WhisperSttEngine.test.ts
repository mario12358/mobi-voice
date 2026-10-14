import { sttEntry, type SttEntry } from '../../../models/catalog';
import type { WhisperVariant } from '../../../state/settings';
import type { SpeechSegment } from '../../types';
import { toPcm16, WhisperSttEngine, type WhisperContextLike } from '../WhisperSttEngine';

const SEGMENT: SpeechSegment = {
  samples: new Float32Array([0, 0.5, -0.5, 1, -1]),
  sampleRate: 16_000,
  startMs: 0,
  endMs: 300,
};

class FakeWhisperContext implements WhisperContextLike {
  readonly calls: { data: ArrayBuffer; options: { language: string; translate: boolean } }[] = [];
  released = false;

  constructor(private readonly text: string) {}

  transcribeData(data: ArrayBuffer, options: { language: string; translate: boolean }) {
    this.calls.push({ data, options });
    return { promise: Promise.resolve({ result: ` ${this.text} ` }) };
  }

  async release(): Promise<void> {
    this.released = true;
  }
}

function setup(downloaded: WhisperVariant[] = ['small', 'base']) {
  let variant: WhisperVariant = 'small';
  const contexts = new Map<string, FakeWhisperContext>();
  const initWhisper = jest.fn(async (modelPath: string) => {
    const context = new FakeWhisperContext(`tekst z ${modelPath}`);
    contexts.set(modelPath, context);
    return context;
  });
  const engine = new WhisperSttEngine(
    {
      currentModel: () => sttEntry(variant),
      modelPath: async (entry: SttEntry) =>
        downloaded.includes(entry.variant) ? `/models/${entry.id}` : null,
    },
    initWhisper,
  );
  return {
    engine,
    initWhisper,
    contexts,
    choose: (next: WhisperVariant) => {
      variant = next;
    },
  };
}

describe('WhisperSttEngine', () => {
  const fetchBefore = global.fetch;

  afterEach(() => {
    global.fetch = fetchBefore;
  });

  // specky: crit 01M4TPSCA6KQW1NH3DSRYASVF3
  it('transcribes Polish speech from the downloaded model without touching the network', async () => {
    const fetchSpy = jest.fn(() => Promise.reject(new Error('offline')));
    global.fetch = fetchSpy;
    const { engine, contexts } = setup();

    await expect(engine.transcribe(SEGMENT)).resolves.toBe('tekst z /models/whisper-small');

    expect(fetchSpy).not.toHaveBeenCalled();
    const [call] = contexts.get('/models/whisper-small')?.calls ?? [];
    expect(call?.options).toEqual({ language: 'pl', translate: false });
    expect(Array.from(new Int16Array(call?.data ?? new ArrayBuffer(0)))).toEqual([
      0, 16384, -16383, 32767, -32767,
    ]);
  });

  // specky: crit 01M4TPSCA6EWAV8RB7HWB6XR17
  it('switches between whisper small and base following the setting, keeping one model in memory', async () => {
    const { engine, initWhisper, contexts, choose } = setup();

    await engine.transcribe(SEGMENT);
    await engine.transcribe(SEGMENT);
    expect(initWhisper).toHaveBeenCalledTimes(1);

    choose('base');
    await expect(engine.transcribe(SEGMENT)).resolves.toBe('tekst z /models/whisper-base');

    expect(initWhisper).toHaveBeenLastCalledWith('/models/whisper-base');
    expect(contexts.get('/models/whisper-small')?.released).toBe(true);
  });

  it('reports a variant that is not downloaded as a missing model', async () => {
    const { engine, choose } = setup(['small']);
    choose('base');

    await expect(engine.transcribe(SEGMENT)).rejects.toMatchObject({ code: 'model_missing' });
  });

  it('rejects audio that is not 16 kHz', async () => {
    const { engine } = setup();

    await expect(engine.transcribe({ ...SEGMENT, sampleRate: 44_100 })).rejects.toThrow('16000 Hz');
  });

  it('clips samples outside [-1, 1] when converting to 16-bit PCM', () => {
    expect(Array.from(new Int16Array(toPcm16(new Float32Array([2, -3]))))).toEqual([32767, -32767]);
  });
});
