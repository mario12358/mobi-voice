import type { TtsEngine } from '../types';

interface Utterance {
  text: string;
  finish: () => void;
  onStart?: () => void;
}

// Speaks queued sentences one after another, each for a fixed duration, like the real voice.
export class FakeTtsEngine implements TtsEngine {
  readonly spoken: string[] = [];
  private readonly queue: Utterance[] = [];
  private current: Utterance | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly speechDurationMs = 0) {}

  get isSpeaking(): boolean {
    return this.current !== null;
  }

  beginAnswer(): void {}

  // e2e builds show the last sentence given to the voice, for Detox to wait on.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  speak(text: string, onStart?: () => void): Promise<void> {
    this.spoken.push(text);
    for (const listener of this.listeners) listener();
    return new Promise((resolve) => {
      this.queue.push({ text, finish: resolve, onStart });
      if (this.current === null) this.playNext();
    });
  }

  async stop(): Promise<void> {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const dropped = [this.current, ...this.queue.splice(0)];
    this.current = null;
    for (const utterance of dropped) utterance?.finish();
  }

  private playNext(): void {
    const next = this.queue.shift() ?? null;
    this.current = next;
    if (next === null) return;
    next.onStart?.();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.current = null;
      next.finish();
      this.playNext();
    }, this.speechDurationMs);
  }
}
