import type { AudioChunk, AudioSource, TtsEngine } from '../engines/types';
import type { AudioPorts, InterruptionPhase, MicPermissionStatus } from './types';

export type AudioSessionState = 'idle' | 'listening' | 'interrupted';

export type StartResult = 'listening' | 'permission_denied';

interface Deps extends AudioPorts {
  source: () => AudioSource;
  tts: () => TtsEngine;
}

// Owns the microphone for the voice session: permission, keeping the screen on and audio interruptions.
// An interruption (phone call) stops listening and reading aloud; afterwards listening resumes, but the
// interrupted answer is not read again (MV-VOICE-7).
export class AudioSessionService {
  private state: AudioSessionState = 'idle';
  private onChunk: ((chunk: AudioChunk) => void) | null = null;
  private readonly listeners = new Set<(state: AudioSessionState) => void>();
  private unsubscribeInterruptions: (() => void) | null = null;

  constructor(private readonly deps: Deps) {}

  get current(): AudioSessionState {
    return this.state;
  }

  permission(): Promise<MicPermissionStatus> {
    return this.deps.permission.status();
  }

  openSystemSettings(): Promise<void> {
    return this.deps.permission.openSystemSettings();
  }

  onStateChange(listener: (state: AudioSessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(onChunk: (chunk: AudioChunk) => void): Promise<StartResult> {
    if (this.state !== 'idle') return 'listening';
    const status = await this.deps.permission.request();
    if (status !== 'granted') return 'permission_denied';

    this.onChunk = onChunk;
    this.unsubscribeInterruptions = this.deps.interruptions.subscribe(
      (phase) => void this.interrupted(phase),
    );
    await this.deps.keepAwake.activate();
    await this.deps.source().start(onChunk);
    this.setState('listening');
    return 'listening';
  }

  async stop(): Promise<void> {
    if (this.state === 'idle') return;
    this.unsubscribeInterruptions?.();
    this.unsubscribeInterruptions = null;
    this.onChunk = null;
    this.setState('idle');
    await this.deps.source().stop();
    await this.deps.keepAwake.deactivate();
  }

  private async interrupted(phase: InterruptionPhase): Promise<void> {
    if (phase === 'began' && this.state === 'listening') {
      this.setState('interrupted');
      await Promise.all([this.deps.source().stop(), this.deps.tts().stop()]);
    } else if (phase === 'ended' && this.state === 'interrupted' && this.onChunk !== null) {
      await this.deps.source().start(this.onChunk);
      this.setState('listening');
    }
  }

  private setState(state: AudioSessionState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
}
