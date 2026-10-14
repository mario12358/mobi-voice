import { encodeWav, synthesize } from '../../__tests__/support/audio';
import { EnergyVadEngine } from '../../fakes/EnergyVadEngine';
import type { AudioChunk, VadEvent } from '../../types';
import { parseWav } from '../../wav';
import { EndpointingVad, type SpeechDetector } from '../EndpointingVad';

const SAMPLE_RATE = 16_000;
const FRAME_MS = 100;
const FRAME = (SAMPLE_RATE * FRAME_MS) / 1000;

// Detector driven by a script of 100 ms frames: '#' is speech, '.' is silence.
class ScriptedDetector implements SpeechDetector {
  resets = 0;
  private position = 0;

  constructor(private readonly script: string) {}

  async load(): Promise<void> {}

  frameLength(): number {
    return FRAME;
  }

  isSpeech(): boolean {
    const symbol = this.script[this.position];
    this.position += 1;
    return symbol === '#';
  }

  reset(): void {
    this.resets += 1;
  }
}

function feed(vad: EndpointingVad, frames: number): VadEvent[] {
  return vad.process({ samples: new Float32Array(frames * FRAME), sampleRate: SAMPLE_RATE });
}

function ends(events: VadEvent[]) {
  return events.flatMap((event) => (event.type === 'speech_end' ? [event.segment] : []));
}

// Recorded-file path: WAV bytes → samples → VAD in 100 ms chunks, as from the microphone.
function segmentWav(vad: EndpointingVad, audio: AudioChunk): VadEvent[] {
  const decoded = parseWav(encodeWav(audio));
  const events: VadEvent[] = [];
  for (let start = 0; start < decoded.samples.length; start += FRAME) {
    events.push(
      ...vad.process({ samples: decoded.samples.subarray(start, start + FRAME), sampleRate: SAMPLE_RATE }),
    );
  }
  return events;
}

describe('EndpointingVad', () => {
  it('ends an utterance after silence equal to the threshold, with the speech audio', () => {
    const vad = new EndpointingVad(new ScriptedDetector('..###..........'));
    vad.setSilenceThresholdMs(1_000);

    const events = feed(vad, 15);

    expect(events.map((event) => event.type)).toEqual(['speech_start', 'speech_end']);
    const [segment] = ends(events);
    expect(segment?.startMs).toBe(200);
    expect(segment?.endMs).toBe(500);
  });

  it('keeps one utterance across a pause shorter than the threshold', () => {
    const vad = new EndpointingVad(new ScriptedDetector('##.........##..........'));
    vad.setSilenceThresholdMs(1_000);

    expect(ends(feed(vad, 23))).toEqual([expect.objectContaining({ startMs: 0, endMs: 1_300 })]);
  });

  // specky: crit 01M4TPSC0BNXA9C4VKYN7C7HRN
  it('applies a changed threshold from the next utterance, not the one in progress', () => {
    const vad = new EndpointingVad(new ScriptedDetector('##' + '.'.repeat(30) + '##' + '.'.repeat(20)));
    vad.setSilenceThresholdMs(3_000);

    expect(feed(vad, 2).map((event) => event.type)).toEqual(['speech_start']);
    vad.setSilenceThresholdMs(1_500);
    // Still 3 s for the current utterance: 1.5 s of silence does not end it.
    expect(ends(feed(vad, 15))).toEqual([]);
    expect(ends(feed(vad, 15))).toHaveLength(1);

    // The next utterance uses 1.5 s.
    feed(vad, 2);
    expect(ends(feed(vad, 15))).toHaveLength(1);
  });

  it('resets the detector and drops a half-heard utterance', () => {
    const detector = new ScriptedDetector('###' + '.'.repeat(40));
    const vad = new EndpointingVad(detector);
    feed(vad, 3);

    vad.reset();

    expect(detector.resets).toBe(1);
    expect(feed(vad, 40)).toEqual([]);
  });
});

describe('VAD on recorded WAV files', () => {
  it('cuts speech separated by long silence into separate utterances', () => {
    const vad = new EnergyVadEngine();
    vad.setSilenceThresholdMs(1_500);

    const segments = ends(
      segmentWav(vad, synthesize([{ tone: 800 }, { silence: 2_000 }, { tone: 600 }, { silence: 1_600 }])),
    );

    expect(segments.map((segment) => [segment.startMs, segment.endMs])).toEqual([
      [0, 800],
      [2_800, 3_400],
    ]);
  });

  it('treats quiet background noise as silence', () => {
    const vad = new EnergyVadEngine();
    vad.setSilenceThresholdMs(1_500);

    const events = segmentWav(vad, synthesize([{ noise: 1_000 }, { tone: 700 }, { noise: 2_000 }]));

    expect(events.map((event) => event.type)).toEqual(['speech_start', 'speech_end']);
    expect(ends(events)[0]).toMatchObject({ startMs: 1_000, endMs: 1_700 });
  });

  it('hears nothing in a file of silence and noise', () => {
    const vad = new EnergyVadEngine();
    expect(segmentWav(vad, synthesize([{ silence: 2_000 }, { noise: 4_000 }]))).toEqual([]);
  });
});
