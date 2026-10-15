import * as Sentry from '@sentry/react-native';

import type { CrashEvent, CrashSdk } from './CrashReporting';

// Sentry with everything that could carry personal data switched off; the event is scrubbed again in
// beforeSend (CrashReporting). No performance tracing, sessions, screenshots or view hierarchy.
export const sentrySdk: CrashSdk = {
  init: ({ dsn, beforeSend }) => {
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      tracesSampleRate: 0,
      enableAutoSessionTracking: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableCaptureFailedRequests: false,
      beforeSend: (event) => beforeSend(event as unknown as CrashEvent) as unknown as typeof event | null,
    });
  },
  close: async () => {
    await Sentry.close();
  },
};
