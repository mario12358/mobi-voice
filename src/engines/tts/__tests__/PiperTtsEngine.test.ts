import { ttsEntry, type TtsEntry } from '../../../models/catalog';
import type { TtsVoice } from '../../../state/settings';
import { PiperTtsEngine, type PiperNative, type SpeechAudio } from '../PiperTtsEngine';

// Native side driven by the test: playback of each sentence ends when the test calls finish().
class FakePiperNative implements PiperNative {
  loadedModel: string | null = null;
  readonly played: string[] = [];
  readonly events: string[] = [];
  stops = 0;
  private finishCurrent: (() => void) | null = null;

  async loadTts(model: string): Promise<void> {
    this.loadedModel = model;
  }

  async synthesize(text: string): Promise<SpeechAudio> {
    this.events.push(`synthesize ${text}`);
    return { data: `${this.loadedModel}|${text}`, sampleRate: 22_050 };
  }

  play(data: string): Promise<void> {
    this.played.push(data);
    this.events.push(`play ${data.split('|')[1]}`);
    return new Promise((resolve) => {
      this.finishCurrent = resolve;
    });
  }

  async stopPlayback(): Promise<void> {
    this.stops += 1;
    this.finishCurrent?.();
    this.finishCurrent = null;
  }

  finish(): void {
    const finish = this.finishCurrent;
    this.finishCurrent = null;
    finish?.();
  }
}

async function flush() {
  for (let step = 0; step < 10; step += 1) await Promise.resolve();
}

function setup(downloaded: TtsVoice[] = ['gosia', 'darkman']) {
  let voice: TtsVoice = 'gosia';
  const native = new FakePiperNative();
  const engine = new PiperTtsEngine(
    {
      currentVoice: () => ttsEntry(voice),
      files: async (entry: TtsEntry) =>
        downloaded.includes(entry.voice)
          ? {
              model: `/models/${entry.voice}.onnx`,
              tokens: '/models/tokens.txt',
              dataDir: '/models/espeak-ng-data',
            }
          : null,
    },
    native,
  );
  return {
    engine,
    native,
    choose: (next: TtsVoice) => {
      voice = next;
    },
  };
}

describe('PiperTtsEngine', () => {
  it('plays sentences in order, synthesizing the next one while the previous plays', async () => {
    const { engine, native } = setup();

    const first = engine.speak('Pierwsze.');
    const second = engine.speak('Drugie.');
    await flush();

    expect(native.events).toEqual(['synthesize Pierwsze.', 'play Pierwsze.', 'synthesize Drugie.']);
    native.finish();
    await first;
    await flush();
    native.finish();
    await second;
    expect(native.events.at(-1)).toBe('play Drugie.');
  });

  it('stop() silences the current sentence and drops the queued ones', async () => {
    const { engine, native } = setup();
    const first = engine.speak('Pierwsze.');
    const second = engine.speak('Drugie.');
    await flush();

    await engine.stop();
    await Promise.all([first, second]);

    expect(native.stops).toBe(1);
    expect(native.played).toHaveLength(1);
  });

  // specky: crit 01M4TPSCC9BC53Y8CGF03ZF04R
  it('keeps the voice for the whole answer and switches from the next answer', async () => {
    const { engine, native, choose } = setup();

    engine.beginAnswer();
    const first = engine.speak('Zdanie Gosi.');
    choose('darkman');
    const second = engine.speak('Dalej Gosia.');
    await flush();
    native.finish();
    await first;
    await flush();
    native.finish();
    await second;

    engine.beginAnswer();
    const next = engine.speak('Teraz Darkman.');
    await flush();
    native.finish();
    await next;

    expect(native.played).toEqual([
      '/models/gosia.onnx|Zdanie Gosi.',
      '/models/gosia.onnx|Dalej Gosia.',
      '/models/darkman.onnx|Teraz Darkman.',
    ]);
  });

  // specky: crit 01M4TPSCC9WQ6ZKBQT91ANM77J
  it('synthesizes from the downloaded voice without touching the network', async () => {
    const fetchBefore = global.fetch;
    const fetchSpy = jest.fn(() => Promise.reject(new Error('offline')));
    global.fetch = fetchSpy;
    try {
      const { engine, native } = setup();
      const spoken = engine.speak('Bez sieci.');
      await flush();
      native.finish();
      await spoken;

      expect(native.played).toEqual(['/models/gosia.onnx|Bez sieci.']);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = fetchBefore;
    }
  });

  it('reports a voice that is not downloaded as a missing model', async () => {
    const { engine } = setup(['darkman']);

    await expect(engine.speak('Cześć.')).rejects.toMatchObject({ code: 'model_missing' });
  });
});
