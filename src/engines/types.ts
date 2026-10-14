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
  // Resolves when the text has been played or playback was stopped; onStart fires when it becomes audible.
  speak(text: string, onStart?: () => void): Promise<void>;
  stop(): Promise<void>;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// A function the model may call instead of answering (cloud models only, MV-CMD-1).
export interface ToolDefinition {
  name: string;
  description: string;
  // JSON Schema of the arguments object.
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmRequest {
  systemPrompt: string | null;
  messages: ChatMessage[];
  maxTokens?: number;
  // Catalog id of the model chosen for the topic; absent means the global choice (MV-MOD-5).
  model?: string;
  tools?: ToolDefinition[];
}

export interface LlmResult {
  text: string;
  aborted: boolean;
  // The first tool the model called, when it called one.
  toolCall?: ToolCall;
}

// Tool arguments arrive as JSON text; a malformed or non-object payload counts as no arguments.
export function parseToolArguments(json: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(json === '' ? '{}' : json);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
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
  load(): Promise<void>;
  start(onKeyword: (keyword: Keyword) => void): Promise<void>;
  // Microphone audio; heard only between start() and stop().
  accept(chunk: AudioChunk): void;
  stop(): Promise<void>;
}
