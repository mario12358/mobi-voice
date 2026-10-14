import type { MobiAudioNativeModule } from '../../../modules/mobi-audio';
import type { AudioChunk, Keyword, KeywordSpotter } from '../types';

type KwsNative = Pick<MobiAudioNativeModule, 'loadKws' | 'kwsAccept' | 'kwsReset'>;

// "Stop" spotting with sherpa-onnx KWS in the MobiAudio native module; the model ships inside the app.
export class SherpaKeywordSpotter implements KeywordSpotter {
  private listener: ((keyword: Keyword) => void) | null = null;

  constructor(
    private readonly native: () => KwsNative,
    private readonly sampleRate: number,
  ) {}

  load(): Promise<void> {
    return this.native().loadKws(this.sampleRate);
  }

  async start(onKeyword: (keyword: Keyword) => void): Promise<void> {
    // Fresh stream: audio from before the answer must not complete a keyword now.
    this.native().kwsReset();
    this.listener = onKeyword;
  }

  accept(chunk: AudioChunk): void {
    if (this.listener === null) return;
    // A copy, because the native side reads the whole underlying buffer of a subarray view.
    const heard = this.native().kwsAccept(chunk.samples.slice(), chunk.sampleRate);
    if (heard === 'stop') this.listener('stop');
  }

  async stop(): Promise<void> {
    this.listener = null;
  }
}
