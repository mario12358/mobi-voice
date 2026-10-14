import { DomainError } from '../../core/errors';
import type { SttEntry } from '../../models/catalog';
import type { SpeechSegment, SttEngine } from '../types';

export const WHISPER_SAMPLE_RATE = 16_000;

// The slice of whisper.rn's WhisperContext the app uses (lets Jest run without the native module).
export interface WhisperContextLike {
  transcribeData(
    data: ArrayBuffer,
    options: { language: string; translate: boolean },
  ): { promise: Promise<{ result: string }> };
  release(): Promise<void>;
}

export type InitWhisper = (modelPath: string) => Promise<WhisperContextLike>;

export interface WhisperModelResolver {
  // The variant chosen in settings right now (small by default, base for weaker phones).
  currentModel(): SttEntry;
  // Path of the downloaded GGML file, or null when it is not on the device.
  modelPath(entry: SttEntry): Promise<string | null>;
}

// whisper.rn reads 16-bit little-endian PCM from an ArrayBuffer.
export function toPcm16(samples: Float32Array): ArrayBuffer {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = Math.round(sample * 32767);
  }
  return pcm.buffer;
}

// On-device speech recognition (whisper.cpp): Polish forced, no network, one model in memory.
export class WhisperSttEngine implements SttEngine {
  private loaded: { modelPath: string; context: Promise<WhisperContextLike> } | null = null;

  constructor(
    private readonly models: WhisperModelResolver,
    private readonly initWhisper: InitWhisper,
  ) {}

  async transcribe(segment: SpeechSegment): Promise<string> {
    if (segment.sampleRate !== WHISPER_SAMPLE_RATE) {
      throw new Error(`Whisper expects ${WHISPER_SAMPLE_RATE} Hz audio, got ${segment.sampleRate} Hz`);
    }
    const model = this.models.currentModel();
    const path = await this.models.modelPath(model);
    if (path === null) throw new DomainError('model_missing', model.id);

    const context = await this.acquire(path);
    const { result } = await context.transcribeData(toPcm16(segment.samples), {
      language: 'pl',
      translate: false,
    }).promise;
    return result.trim();
  }

  async release(): Promise<void> {
    const loaded = this.loaded;
    this.loaded = null;
    if (loaded !== null) await (await loaded.context).release();
  }

  // A variant change in settings swaps the model before the next utterance.
  private async acquire(modelPath: string): Promise<WhisperContextLike> {
    if (this.loaded?.modelPath === modelPath) return this.loaded.context;
    await this.release();
    const context = this.initWhisper(modelPath);
    this.loaded = { modelPath, context };
    try {
      return await context;
    } catch (error) {
      this.loaded = null;
      throw error;
    }
  }
}
