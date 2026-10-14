import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { MicPermissionStatus } from '../../audio/types';
import { useServices } from '../../services/ServicesProvider';

export interface MicPermissionView {
  status: MicPermissionStatus | null;
  openSystemSettings(): void;
}

// Re-read on return to the app: the user may have just changed the permission in system settings.
export function useMicPermission(): MicPermissionView {
  const { audio } = useServices();
  const [status, setStatus] = useState<MicPermissionStatus | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void audio.permission().then((next) => {
        if (active) setStatus(next);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [audio]);

  const openSystemSettings = useCallback(() => void audio.openSystemSettings(), [audio]);
  return { status, openSystemSettings };
}
