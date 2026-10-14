import { EndpointingVad, type SpeechDetector } from '../vad/EndpointingVad';

const FRAME_MS = 20;
const SPEECH_RMS_THRESHOLD = 0.02;

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

const energyDetector: SpeechDetector = {
  load: async () => {},
  frameLength: (sampleRate) => Math.round((sampleRate * FRAME_MS) / 1000),
  isSpeech: (frame) => rms(frame) >= SPEECH_RMS_THRESHOLD,
  reset: () => {},
};

// Deterministic energy-based VAD used in tests and e2e builds instead of Silero.
export class EnergyVadEngine extends EndpointingVad {
  constructor() {
    super(energyDetector);
  }
}
