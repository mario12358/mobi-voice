import type { SpeechSegment, SttEngine } from '../types';

// What the e2e build "hears" in every injected utterance.
export const E2E_TRANSCRIPT = 'Gdzie jechać nad jezioro?';

export class FakeSttEngine implements SttEngine {
  readonly segments: SpeechSegment[] = [];
  private readonly transcripts: string[];

  // `fallback` is returned once the scripted transcripts run out (e2e builds hear the same sentence).
  constructor(
    transcripts: string[] = [],
    private readonly fallback = '',
  ) {
    this.transcripts = [...transcripts];
  }

  enqueue(...transcripts: string[]): void {
    this.transcripts.push(...transcripts);
  }

  async transcribe(segment: SpeechSegment): Promise<string> {
    this.segments.push(segment);
    return this.transcripts.shift() ?? this.fallback;
  }

  async release(): Promise<void> {
    this.transcripts.length = 0;
  }
}
