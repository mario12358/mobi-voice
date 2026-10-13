jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// Native-only modules: unit tests use fakes; files that test an adapter mock these themselves.
jest.mock('llama.rn', () => ({ initLlama: jest.fn(), releaseAllLlama: jest.fn() }));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: { fs: { dirs: { DocumentDir: '/docs' } }, config: jest.fn() },
}));
