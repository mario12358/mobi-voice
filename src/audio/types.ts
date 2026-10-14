export type MicPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface MicPermission {
  status(): Promise<MicPermissionStatus>;
  // Shows the system prompt when it may still be shown; otherwise just reports the status.
  request(): Promise<MicPermissionStatus>;
  openSystemSettings(): Promise<void>;
}

export type InterruptionPhase = 'began' | 'ended';

// A phone call or another app taking over the audio (iOS interruption, Android audio focus loss).
export interface AudioInterruptions {
  subscribe(listener: (phase: InterruptionPhase) => void): () => void;
}

export interface KeepAwake {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}

export interface AudioPorts {
  permission: MicPermission;
  interruptions: AudioInterruptions;
  keepAwake: KeepAwake;
}
