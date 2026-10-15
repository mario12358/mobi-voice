import { FakeAudioPorts } from '../audio/fakeAudioPorts';
import type { EngineRegistry } from '../engines/EngineRegistry';
import { FakeKeywordSpotter } from '../engines/fakes/FakeKeywordSpotter';
import { FakeSttEngine } from '../engines/fakes/FakeSttEngine';
import { WavAudioSource } from '../engines/fakes/WavAudioSource';
import { MemoryShareSheet } from '../share/memoryShareSheet';

// e2e builds only: the microphone permission Detox tests can deny, and a spoken utterance they can inject.
export const e2eAudioPorts = new FakeAudioPorts();

// A "4 GB" phone as it reports itself: 3B models are not recommended, 1–2B ones are fine.
export const E2E_MEMORY_BYTES = 3_700_000_000;

// e2e builds only: copied and shared text stays here, so tests can check it without the system sheet.
export const e2eShareSheet = new MemoryShareSheet();

const SAMPLE_RATE = 16_000;

// 0.8 s of a tone (speech for the energy VAD), then 3.2 s of silence — past the default 3 s threshold.
function utterance(): Float32Array {
  const speech = Math.round(SAMPLE_RATE * 0.8);
  const total = speech + Math.round(SAMPLE_RATE * 3.2);
  return Float32Array.from({ length: total }, (_, index) =>
    index < speech ? 0.3 * Math.sin((2 * Math.PI * 440 * index) / SAMPLE_RATE) : 0,
  );
}

// Interrupted mode: two parts of one utterance, the second closed with the end word.
export const E2E_PART = 'Planuję wyjazd na Mazury';
export const E2E_CLOSING = 'co polecasz? Odbiór.';
// The fake model answers a question with "długo" at length — time to say "stop" while it is read.
export const E2E_LONG_QUESTION = 'Opowiedz długo o Mazurach';

// `transcript` is what the fake STT recognizes in this utterance (default: the fixed e2e sentence).
export function injectUtterance(engines: EngineRegistry, transcript?: string): void {
  const stt = engines.stt();
  if (transcript !== undefined && stt instanceof FakeSttEngine) stt.enqueue(transcript);
  const source = engines.audioSource();
  if (source instanceof WavAudioSource) {
    source.enqueueAudio({ samples: utterance(), sampleRate: SAMPLE_RATE });
  }
}

export function denyMicrophone(): void {
  e2eAudioPorts.setPermission('denied');
}

// The fake keyword spotter "hears" stop (only while it listens, like the real one).
export function sayStop(engines: EngineRegistry): void {
  const spotter = engines.keywordSpotter();
  if (spotter instanceof FakeKeywordSpotter) spotter.trigger('stop');
}
