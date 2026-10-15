import { useEffect } from 'react';

import { useSettingsStore } from '../../state/settings';
import type { CrashReporting } from './CrashReporting';

// Follows the consent switch in Settings: on starts crash reporting, off stops it (MV-SEC-2).
export function useCrashReporting(reporting: CrashReporting | null): void {
  const consent = useSettingsStore((state) => state.crashReportsConsent);
  useEffect(() => {
    void reporting?.apply(consent);
  }, [reporting, consent]);
}
