import type { SpeechDetector } from './EndpointingVad';
import { nativeAudio } from '../audio/NativeMicrophone';

// Silero VAD works on 512-sample windows at 16 kHz (32 ms).
const SILERO_WINDOW = 512;

// Silero VAD (sherpa-onnx in the MobiAudio native module); the model ships inside the app.
export class SileroSpeechDetector implements SpeechDetector {
  constructor(private readonly sampleRate: number) {}

  load(): Promise<void> {
    return nativeAudio().loadVad(this.sampleRate);
  }

  frameLength(): number {
    return SILERO_WINDOW;
  }

  isSpeech(frame: Float32Array): boolean {
    // A copy, because the native side reads the whole underlying buffer of a subarray view.
    return nativeAudio().vadAccept(frame.slice());
  }

  reset(): void {
    nativeAudio().vadReset();
  }
}
