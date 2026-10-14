export interface AudioChunk {
  samples: Float32Array;
  sampleRate: number;
}

export interface AudioSource {
  start(onChunk: (chunk: AudioChunk) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface SpeechSegment {
  samples: Float32Array;
  sampleRate: number;
  startMs: number;
  endMs: number;
}

export interface SttEngine {
  transcribe(segment: SpeechSegment): Promise<string>;
  release(): Promise<void>;
}

export interface TtsEngine {
  // Starts a new answer: the voice chosen in settings applies from here on.
  beginAnswer(): void;
  // Resolves when the text has been played or playback was stopped.
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LlmRequest {
  systemPrompt: string | null;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface LlmResult {
  text: string;
  aborted: boolean;
}

export interface LlmEngine {
  generate(request: LlmRequest, onToken: (token: string) => void, signal: AbortSignal): Promise<LlmResult>;
}

export type VadEvent =
  { type: 'speech_start'; atMs: number } | { type: 'speech_end'; segment: SpeechSegment };

export interface VadEngine {
  load(): Promise<void>;
  setSilenceThresholdMs(milliseconds: number): void;
  process(chunk: AudioChunk): VadEvent[];
  reset(): void;
}

export type Keyword = 'stop';

export interface KeywordSpotter {
  start(onKeyword: (keyword: Keyword) => void): Promise<void>;
  stop(): Promise<void>;
}
