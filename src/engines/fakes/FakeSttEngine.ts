import type { SpeechSegment, SttEngine } from '../types';

export class FakeSttEngine implements SttEngine {
  readonly segments: SpeechSegment[] = [];
  private readonly transcripts: string[];

  constructor(transcripts: string[] = []) {
    this.transcripts = [...transcripts];
  }

  enqueue(...transcripts: string[]): void {
    this.transcripts.push(...transcripts);
  }

  async transcribe(segment: SpeechSegment): Promise<string> {
    this.segments.push(segment);
    return this.transcripts.shift() ?? '';
  }

  async release(): Promise<void> {
    this.transcripts.length = 0;
  }
}
