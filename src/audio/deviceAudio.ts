import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Linking } from 'react-native';

import type { NativePermissionResponse } from '../../modules/mobi-audio';
import { nativeAudio } from '../engines/audio/NativeMicrophone';
import type { AudioPorts, MicPermissionStatus } from './types';

const KEEP_AWAKE_TAG = 'voice-session';

// A denial the system will not ask about again is reported as denied; one it may still ask about stays open.
function toStatus(response: NativePermissionResponse): MicPermissionStatus {
  if (response.status === 'granted') return 'granted';
  return response.status === 'denied' && !response.canAskAgain ? 'denied' : 'undetermined';
}

export const deviceAudioPorts: AudioPorts = {
  permission: {
    status: async () => toStatus(await nativeAudio().getPermission()),
    request: async () => {
      const current = await nativeAudio().getPermission();
      if (current.status === 'granted' || !current.canAskAgain) return toStatus(current);
      const answer = await nativeAudio().requestPermission();
      // Right after the user taps "Deny" the system still reports that it can ask again.
      return answer.status === 'granted' ? 'granted' : 'denied';
    },
    openSystemSettings: () => Linking.openSettings(),
  },
  interruptions: {
    subscribe: (listener) => {
      const subscription = nativeAudio().addListener('onInterruption', (event) => listener(event.phase));
      return () => subscription.remove();
    },
  },
  keepAwake: {
    activate: () => activateKeepAwakeAsync(KEEP_AWAKE_TAG),
    deactivate: () => deactivateKeepAwake(KEEP_AWAKE_TAG),
  },
};
