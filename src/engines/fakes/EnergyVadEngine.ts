import type { AudioChunk, VadEngine, VadEvent } from '../types';

const FRAME_MS = 20;
const SPEECH_RMS_THRESHOLD = 0.02;

function rms(samples: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let index = start; index < end; index += 1) {
    const sample = samples[index] ?? 0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / Math.max(1, end - start));
}

// Deterministic energy-based VAD used in tests and e2e builds instead of Silero.
export class EnergyVadEngine implements VadEngine {
  private silenceThresholdMs = 3_000;
  private processedMs = 0;
  private speechStartMs: number | null = null;
  private silenceMs = 0;
  private speechSamples: number[] = [];

  setSilenceThresholdMs(milliseconds: number): void {
    this.silenceThresholdMs = milliseconds;
  }

  reset(): void {
    this.processedMs = 0;
    this.speechStartMs = null;
    this.silenceMs = 0;
    this.speechSamples = [];
  }

  process(chunk: AudioChunk): VadEvent[] {
    const frameLength = Math.max(1, Math.round((chunk.sampleRate * FRAME_MS) / 1000));
    const events: VadEvent[] = [];
    for (let start = 0; start < chunk.samples.length; start += frameLength) {
      const end = Math.min(chunk.samples.length, start + frameLength);
      const event = this.processFrame(chunk, start, end);
      if (event !== null) events.push(event);
    }
    return events;
  }

  private processFrame(chunk: AudioChunk, start: number, end: number): VadEvent | null {
    const frameMs = ((end - start) / chunk.sampleRate) * 1000;
    const isSpeech = rms(chunk.samples, start, end) >= SPEECH_RMS_THRESHOLD;
    const frameStartMs = this.processedMs;
    this.processedMs += frameMs;

    if (this.speechStartMs === null) {
      if (!isSpeech) return null;
      this.speechStartMs = frameStartMs;
      this.silenceMs = 0;
      this.speechSamples = Array.from(chunk.samples.subarray(start, end));
      return { type: 'speech_start', atMs: frameStartMs };
    }

    this.speechSamples.push(...chunk.samples.subarray(start, end));
    this.silenceMs = isSpeech ? 0 : this.silenceMs + frameMs;
    if (this.silenceMs < this.silenceThresholdMs) return null;
    return this.finishSegment(chunk.sampleRate);
  }

  private finishSegment(sampleRate: number): VadEvent {
    const startMs = this.speechStartMs ?? 0;
    const segment = {
      samples: Float32Array.from(this.speechSamples),
      sampleRate,
      startMs,
      endMs: this.processedMs - this.silenceMs,
    };
    this.speechStartMs = null;
    this.silenceMs = 0;
    this.speechSamples = [];
    return { type: 'speech_end', segment };
  }
}
