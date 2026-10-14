import type { AudioChunk, VadEngine, VadEvent } from '../types';

// Frame-level speech/no-speech decision; the utterance boundaries are cut by EndpointingVad.
export interface SpeechDetector {
  load(): Promise<void>;
  frameLength(sampleRate: number): number;
  isSpeech(frame: Float32Array, sampleRate: number): boolean;
  reset(): void;
}

export const DEFAULT_SILENCE_THRESHOLD_MS = 3_000;

// Turns frame decisions into utterances: an utterance ends after continuous silence of the threshold.
// The threshold is fixed when an utterance starts, so a change in settings applies from the next one.
export class EndpointingVad implements VadEngine {
  private silenceThresholdMs = DEFAULT_SILENCE_THRESHOLD_MS;
  private utteranceThresholdMs = DEFAULT_SILENCE_THRESHOLD_MS;
  private processedMs = 0;
  private speechStartMs: number | null = null;
  private silenceMs = 0;
  private speechFrames: Float32Array[] = [];

  constructor(private readonly detector: SpeechDetector) {}

  load(): Promise<void> {
    return this.detector.load();
  }

  setSilenceThresholdMs(milliseconds: number): void {
    this.silenceThresholdMs = milliseconds;
  }

  reset(): void {
    this.detector.reset();
    this.processedMs = 0;
    this.speechStartMs = null;
    this.silenceMs = 0;
    this.speechFrames = [];
  }

  process(chunk: AudioChunk): VadEvent[] {
    const frameLength = Math.max(1, this.detector.frameLength(chunk.sampleRate));
    const events: VadEvent[] = [];
    for (let start = 0; start < chunk.samples.length; start += frameLength) {
      const frame = chunk.samples.subarray(start, Math.min(chunk.samples.length, start + frameLength));
      const event = this.processFrame(frame, chunk.sampleRate);
      if (event !== null) events.push(event);
    }
    return events;
  }

  private processFrame(frame: Float32Array, sampleRate: number): VadEvent | null {
    const frameMs = (frame.length / sampleRate) * 1000;
    const isSpeech = this.detector.isSpeech(frame, sampleRate);
    const frameStartMs = this.processedMs;
    this.processedMs += frameMs;

    if (this.speechStartMs === null) {
      if (!isSpeech) return null;
      this.speechStartMs = frameStartMs;
      this.utteranceThresholdMs = this.silenceThresholdMs;
      this.silenceMs = 0;
      this.speechFrames = [frame.slice()];
      return { type: 'speech_start', atMs: frameStartMs };
    }

    this.speechFrames.push(frame.slice());
    this.silenceMs = isSpeech ? 0 : this.silenceMs + frameMs;
    if (this.silenceMs < this.utteranceThresholdMs) return null;
    return this.finishSegment(sampleRate);
  }

  private finishSegment(sampleRate: number): VadEvent {
    const samples = new Float32Array(this.speechFrames.reduce((total, frame) => total + frame.length, 0));
    let offset = 0;
    for (const frame of this.speechFrames) {
      samples.set(frame, offset);
      offset += frame.length;
    }
    const segment = {
      samples,
      sampleRate,
      startMs: this.speechStartMs ?? 0,
      endMs: this.processedMs - this.silenceMs,
    };
    this.speechStartMs = null;
    this.silenceMs = 0;
    this.speechFrames = [];
    return { type: 'speech_end', segment };
  }
}
