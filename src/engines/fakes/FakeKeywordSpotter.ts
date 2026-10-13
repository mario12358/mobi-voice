import type { Keyword, KeywordSpotter } from '../types';

export class FakeKeywordSpotter implements KeywordSpotter {
  private listener: ((keyword: Keyword) => void) | null = null;

  get isListening(): boolean {
    return this.listener !== null;
  }

  async start(onKeyword: (keyword: Keyword) => void): Promise<void> {
    this.listener = onKeyword;
  }

  async stop(): Promise<void> {
    this.listener = null;
  }

  // Simulates the spotter hearing the keyword; ignored while not listening, like the real one.
  trigger(keyword: Keyword = 'stop'): boolean {
    if (this.listener === null) return false;
    this.listener(keyword);
    return true;
  }
}
