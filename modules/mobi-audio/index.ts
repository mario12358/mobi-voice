import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface NativePermissionResponse {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

// 16-bit little-endian mono PCM, base64-encoded.
export interface NativeAudioEvent {
  data: string;
  sampleRate: number;
}

export interface NativeInterruptionEvent {
  phase: 'began' | 'ended';
}

export interface MobiAudioNativeModule {
  getPermission(): Promise<NativePermissionResponse>;
  requestPermission(): Promise<NativePermissionResponse>;
  startCapture(sampleRate: number): Promise<void>;
  stopCapture(): Promise<void>;
  loadVad(sampleRate: number): Promise<void>;
  // True while Silero VAD hears speech, after feeding it these samples.
  vadAccept(samples: Float32Array): boolean;
  vadReset(): void;
  loadTts(modelPath: string, tokensPath: string, dataDir: string): Promise<void>;
  // 16-bit little-endian mono PCM, base64-encoded, like the microphone events.
  synthesize(text: string): Promise<NativeAudioEvent>;
  // Resolves when the audio has been played back or playback was stopped.
  play(data: string, sampleRate: number): Promise<void>;
  stopPlayback(): Promise<void>;
  addListener(event: 'onAudio', listener: (event: NativeAudioEvent) => void): EventSubscription;
  addListener(event: 'onInterruption', listener: (event: NativeInterruptionEvent) => void): EventSubscription;
}

// Null where the native side is absent (Jest, Expo Go).
export const MobiAudio = requireOptionalNativeModule<MobiAudioNativeModule>('MobiAudio');
