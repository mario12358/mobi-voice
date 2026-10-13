import type { TtsEngine } from '../types';

export class FakeTtsEngine implements TtsEngine {
  readonly spoken: string[] = [];
  private finishCurrent: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly speechDurationMs = 0) {}

  get isSpeaking(): boolean {
    return this.finishCurrent !== null;
  }

  speak(text: string): Promise<void> {
    this.spoken.push(text);
    return new Promise((resolve) => {
      this.finishCurrent = () => {
        this.finishCurrent = null;
        resolve();
      };
      this.timer = setTimeout(() => this.finishCurrent?.(), this.speechDurationMs);
    });
  }

  async stop(): Promise<void> {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.finishCurrent?.();
  }
}
