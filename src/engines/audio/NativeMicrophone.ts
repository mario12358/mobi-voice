import { MobiAudio, type MobiAudioNativeModule } from '../../../modules/mobi-audio';
import { DomainError } from '../../core/errors';
import type { AudioChunk, AudioSource } from '../types';

// Whisper and Silero VAD both take 16 kHz mono.
export const CAPTURE_SAMPLE_RATE = 16000;

export function nativeAudio(): MobiAudioNativeModule {
  if (MobiAudio === null) throw new DomainError('engine_unavailable', 'MobiAudio native module is missing');
  return MobiAudio;
}

export function decodePcm16(base64: string): Float32Array {
  const binary = atob(base64);
  const samples = new Float32Array(binary.length >> 1);
  for (let index = 0; index < samples.length; index += 1) {
    const value = binary.charCodeAt(index * 2) | (binary.charCodeAt(index * 2 + 1) << 8);
    samples[index] = (value >= 0x8000 ? value - 0x10000 : value) / 32768;
  }
  return samples;
}

export class NativeMicrophone implements AudioSource {
  private subscription: { remove(): void } | null = null;

  async start(onChunk: (chunk: AudioChunk) => void): Promise<void> {
    const audio = nativeAudio();
    this.subscription?.remove();
    this.subscription = audio.addListener('onAudio', (event) =>
      onChunk({ samples: decodePcm16(event.data), sampleRate: event.sampleRate }),
    );
    await audio.startCapture(CAPTURE_SAMPLE_RATE);
  }

  async stop(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
    await nativeAudio().stopCapture();
  }
}
