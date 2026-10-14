import type { AudioChunk, AudioSource } from '../types';
import { parseWav } from '../wav';

// Test-mode microphone: plays queued WAV files as audio chunks instead of recording.
export class WavAudioSource implements AudioSource {
  private readonly queue: AudioChunk[] = [];
  private listener: ((chunk: AudioChunk) => void) | null = null;

  constructor(private readonly chunkMs = 100) {}

  get isRunning(): boolean {
    return this.listener !== null;
  }

  enqueueWav(buffer: ArrayBuffer): void {
    this.enqueueAudio(parseWav(buffer));
  }

  enqueueAudio(audio: AudioChunk): void {
    this.queue.push(audio);
    this.flush();
  }

  async start(onChunk: (chunk: AudioChunk) => void): Promise<void> {
    this.listener = onChunk;
    this.flush();
  }

  async stop(): Promise<void> {
    this.listener = null;
  }

  private flush(): void {
    while (this.listener !== null && this.queue.length > 0) {
      const audio = this.queue.shift();
      if (audio !== undefined) this.emitInChunks(audio);
    }
  }

  private emitInChunks(audio: AudioChunk): void {
    const chunkLength = Math.max(1, Math.round((audio.sampleRate * this.chunkMs) / 1000));
    for (let start = 0; start < audio.samples.length && this.listener !== null; start += chunkLength) {
      this.listener({
        samples: audio.samples.subarray(start, start + chunkLength),
        sampleRate: audio.sampleRate,
      });
    }
  }
}
