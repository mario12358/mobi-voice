import { DomainError } from '../../core/errors';
import type { TtsEntry } from '../../models/catalog';
import type { TtsEngine } from '../types';

export interface PiperFiles {
  model: string;
  tokens: string;
  // eSpeak NG data directory (Polish phonemes) shared by both voices.
  dataDir: string;
}

// 16-bit little-endian mono PCM, base64-encoded.
export interface SpeechAudio {
  data: string;
  sampleRate: number;
}

// The MobiAudio native functions the voice needs (lets Jest run without the native module).
export interface PiperNative {
  loadTts(model: string, tokens: string, dataDir: string): Promise<void>;
  synthesize(text: string): Promise<SpeechAudio>;
  play(data: string, sampleRate: number): Promise<void>;
  stopPlayback(): Promise<void>;
}

export interface PiperVoiceResolver {
  // The voice chosen in settings right now (Gosia or Darkman).
  currentVoice(): TtsEntry;
  // Downloaded files of the voice, or null when it is not on the device.
  files(entry: TtsEntry): Promise<PiperFiles | null>;
}

// On-device Piper voices (sherpa-onnx). Sentences queue up: the next one is synthesized while the
// previous plays. stop() silences at once and drops the queue. The voice is fixed per answer, so a
// change in settings is heard from the next answer.
export class PiperTtsEngine implements TtsEngine {
  private answerVoice: TtsEntry | null = null;
  private generation = 0;
  private synthesis: Promise<unknown> = Promise.resolve();
  private playback: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly voices: PiperVoiceResolver,
    private readonly native: PiperNative,
  ) {}

  beginAnswer(): void {
    this.answerVoice = null;
  }

  speak(text: string): Promise<void> {
    const generation = this.generation;
    this.answerVoice ??= this.voices.currentVoice();
    const voice = this.answerVoice;

    // The native synthesizer handles one sentence at a time.
    const audio = this.synthesis.then(() => this.synthesize(voice, text, generation));
    this.synthesis = audio.catch(() => undefined);

    const played = this.playback.then(async () => {
      const speech = await audio;
      if (speech === null || generation !== this.generation) return;
      await this.native.play(speech.data, speech.sampleRate);
    });
    this.playback = played.catch(() => undefined);
    return played;
  }

  async stop(): Promise<void> {
    this.generation += 1;
    this.answerVoice = null;
    await this.native.stopPlayback();
  }

  private async synthesize(voice: TtsEntry, text: string, generation: number): Promise<SpeechAudio | null> {
    if (generation !== this.generation) return null;
    const files = await this.voices.files(voice);
    if (files === null) throw new DomainError('model_missing', voice.id);
    await this.native.loadTts(files.model, files.tokens, files.dataDir);
    if (generation !== this.generation) return null;
    return this.native.synthesize(text);
  }
}
