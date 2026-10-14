import type { AudioPorts, InterruptionPhase, MicPermissionStatus } from './types';

// In-memory audio ports for Jest: a scriptable permission, interruptions fired by the test, a keep-awake flag.
export class FakeAudioPorts implements AudioPorts {
  keptAwake = false;
  settingsOpened = 0;
  private interruptionListeners = new Set<(phase: InterruptionPhase) => void>();

  constructor(
    private permissionStatus: MicPermissionStatus = 'granted',
    private readonly onRequest: MicPermissionStatus = permissionStatus,
  ) {}

  readonly permission = {
    status: async () => this.permissionStatus,
    request: async () => {
      if (this.permissionStatus === 'undetermined') this.permissionStatus = this.onRequest;
      return this.permissionStatus;
    },
    openSystemSettings: async () => {
      this.settingsOpened += 1;
    },
  };

  readonly interruptions = {
    subscribe: (listener: (phase: InterruptionPhase) => void) => {
      this.interruptionListeners.add(listener);
      return () => {
        this.interruptionListeners.delete(listener);
      };
    },
  };

  readonly keepAwake = {
    activate: async () => {
      this.keptAwake = true;
    },
    deactivate: async () => {
      this.keptAwake = false;
    },
  };

  interrupt(phase: InterruptionPhase): void {
    for (const listener of this.interruptionListeners) listener(phase);
  }
}
