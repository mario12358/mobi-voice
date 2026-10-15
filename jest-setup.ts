jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// Native-only modules: unit tests use fakes; files that test an adapter mock these themselves.
jest.mock('llama.rn', () => ({ initLlama: jest.fn(), releaseAllLlama: jest.fn() }));
jest.mock('whisper.rn/index', () => ({ initWhisper: jest.fn(), releaseAllWhisper: jest.fn() }));
// Crash reporting is tested through its port (CrashReporting); the native SDK never loads in Jest.
jest.mock('@sentry/react-native', () => ({ init: jest.fn(), close: jest.fn(async () => {}) }));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: { dirs: { DocumentDir: '/docs' }, exists: jest.fn(async () => false), stat: jest.fn() },
    config: jest.fn(),
  },
}));
