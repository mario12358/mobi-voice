import type { AudioSessionService, StartResult } from '../../audio/AudioSessionService';
import type {
  AudioChunk,
  KeywordSpotter,
  SpeechSegment,
  SttEngine,
  TtsEngine,
  VadEngine,
} from '../../engines/types';
import type { ConversationService } from '../ConversationService';
import type { LatencySample } from '../../state/latency';
import { SentenceSplitter } from '../speech/SpeechText';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceListener {
  onState?(state: VoiceState): void;
  // What the user said, as recognized, right before it is sent to the model.
  onTranscript?(text: string): void;
  // Raw model tokens for the chat bubble (Markdown and emoji kept).
  onToken?(token: string): void;
  // The exchange is stored in the topic; the chat can reload its history.
  onExchange?(): void;
  onError?(error: unknown): void;
  // Timings of the exchange, once its first sentence is audible (or it ended without one).
  onLatency?(sample: LatencySample): void;
}

interface Deps {
  audio: AudioSessionService;
  vad: () => VadEngine;
  stt: () => SttEngine;
  tts: () => TtsEngine;
  keywordSpotter: () => KeywordSpotter;
  conversation: ConversationService;
  silenceThresholdMs: () => number;
  recordLatency?: (sample: LatencySample) => void;
  now?: () => number;
}

// Continuous voice mode (MV-VOICE-1): listen → end of utterance after the silence threshold → STT →
// model with the topic's context → answer in the chat and read aloud sentence by sentence → listen again.
// "Stop" (MV-VOICE-3), said or tapped while the answer is prepared or read, ends it and listens at once.
export class VoiceSessionController {
  private state: VoiceState = 'idle';
  private topicId: number | null = null;
  private listener: VoiceListener = {};
  private abort: AbortController | null = null;
  // Bumped by every new utterance and by an interruption: work of an older turn must not go on.
  private turn = 0;

  constructor(private readonly deps: Deps) {}

  get current(): VoiceState {
    return this.state;
  }

  async start(topicId: number, listener: VoiceListener = {}): Promise<StartResult> {
    if (this.state !== 'idle') return 'listening';
    this.topicId = topicId;
    this.listener = listener;
    const vad = this.deps.vad();
    await vad.load();
    vad.reset();
    vad.setSilenceThresholdMs(this.deps.silenceThresholdMs());
    try {
      await this.deps.keywordSpotter().load();
    } catch (error) {
      // Voice still works without the spoken "stop"; the STOP button remains.
      listener.onError?.(error);
    }
    const result = await this.deps.audio.start((chunk) => this.onAudio(chunk));
    if (result === 'listening') this.setState('listening');
    return result;
  }

  async stop(): Promise<void> {
    if (this.state === 'idle') return;
    this.turn += 1;
    this.setState('idle');
    this.abort?.abort();
    this.abort = null;
    await Promise.all([this.deps.audio.stop(), this.deps.tts().stop(), this.deps.keywordSpotter().stop()]);
  }

  // "Stop": the answer ends where it is (the part already generated stays in the chat, marked as
  // interrupted) and the session listens again right away.
  async interrupt(): Promise<void> {
    if (this.state !== 'processing' && this.state !== 'speaking') return;
    this.turn += 1;
    this.abort?.abort();
    this.abort = null;
    this.listenAgain();
    await this.deps.tts().stop();
  }

  // While the answer is prepared or read, the microphone only listens for "stop"; while listening, the
  // assistant's own answer is not an utterance.
  private onAudio(chunk: AudioChunk): void {
    if (this.state === 'processing' || this.state === 'speaking') {
      this.deps.keywordSpotter().accept(chunk);
      return;
    }
    if (this.state !== 'listening') return;
    for (const event of this.deps.vad().process(chunk)) {
      if (event.type === 'speech_end') {
        void this.handleUtterance(event.segment);
        return;
      }
    }
  }

  private now(): number {
    return (this.deps.now ?? Date.now)();
  }

  private async handleUtterance(segment: SpeechSegment): Promise<void> {
    const topicId = this.topicId;
    if (topicId === null) return;
    this.turn += 1;
    const turn = this.turn;
    this.setState('processing');
    void this.deps.keywordSpotter().start(() => void this.interrupt());
    const endedAt = this.now();
    try {
      const text = (await this.deps.stt().transcribe(segment)).trim();
      const sttMs = this.now() - endedAt;
      if (text.length > 0 && this.isCurrent(turn)) await this.answer(topicId, text, turn, endedAt, sttMs);
    } catch (error) {
      this.listener.onError?.(error);
    } finally {
      if (this.isCurrent(turn)) this.listenAgain();
    }
  }

  private async answer(
    topicId: number,
    text: string,
    turn: number,
    endedAt: number,
    sttMs: number,
  ): Promise<void> {
    this.listener.onTranscript?.(text);
    const tts = this.deps.tts();
    tts.beginAnswer();
    const splitter = new SentenceSplitter();
    const reading: Promise<void>[] = [];
    let firstTokenMs: number | null = null;
    let reported = false;
    const report = (firstAudioMs: number | null) => {
      if (reported) return;
      reported = true;
      const sample = { at: endedAt, sttMs, firstTokenMs, firstAudioMs };
      this.deps.recordLatency?.(sample);
      this.listener.onLatency?.(sample);
    };
    const say = (sentences: string[]) => {
      for (const sentence of sentences) {
        if (!this.isCurrent(turn)) return;
        this.setState('speaking');
        reading.push(tts.speak(sentence, () => report(this.now() - endedAt)));
      }
    };

    this.abort = new AbortController();
    try {
      await this.deps.conversation.send(topicId, text, {
        signal: this.abort.signal,
        onToken: (token) => {
          firstTokenMs ??= this.now() - endedAt;
          this.listener.onToken?.(token);
          say(splitter.push(token));
        },
      });
      say(splitter.flush());
      this.listener.onExchange?.();
    } finally {
      this.abort = null;
    }
    await Promise.all(reading);
    report(null);
  }

  private listenAgain(): void {
    void this.deps.keywordSpotter().stop();
    const vad = this.deps.vad();
    vad.reset();
    // A threshold changed in settings applies from the next utterance.
    vad.setSilenceThresholdMs(this.deps.silenceThresholdMs());
    this.setState('listening');
  }

  private isCurrent(turn: number): boolean {
    return this.state !== 'idle' && this.turn === turn;
  }

  private setState(state: VoiceState): void {
    if (this.state === state) return;
    this.state = state;
    this.listener.onState?.(state);
  }
}
