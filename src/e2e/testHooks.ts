import { FakeAudioPorts } from '../audio/fakeAudioPorts';
import type { EngineRegistry } from '../engines/EngineRegistry';
import { WavAudioSource } from '../engines/fakes/WavAudioSource';

// e2e builds only: the microphone permission Detox tests can deny, and a spoken utterance they can inject.
export const e2eAudioPorts = new FakeAudioPorts();

const SAMPLE_RATE = 16_000;

// 0.8 s of a tone (speech for the energy VAD), then 3.2 s of silence — past the default 3 s threshold.
function utterance(): Float32Array {
  const speech = Math.round(SAMPLE_RATE * 0.8);
  const total = speech + Math.round(SAMPLE_RATE * 3.2);
  return Float32Array.from({ length: total }, (_, index) =>
    index < speech ? 0.3 * Math.sin((2 * Math.PI * 440 * index) / SAMPLE_RATE) : 0,
  );
}

export function injectUtterance(engines: EngineRegistry): void {
  const source = engines.audioSource();
  if (source instanceof WavAudioSource) {
    source.enqueueAudio({ samples: utterance(), sampleRate: SAMPLE_RATE });
  }
}

export function denyMicrophone(): void {
  e2eAudioPorts.setPermission('denied');
}
