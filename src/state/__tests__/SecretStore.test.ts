import { SecretStore } from '../SecretStore';
import type { createMemorySecureStore } from './support/memorySecureStore';

jest.mock('expo-secure-store', () => require('./support/memorySecureStore').createMemorySecureStore());
const mockSecureStore: ReturnType<typeof createMemorySecureStore> = jest.requireMock('expo-secure-store');

describe('SecretStore', () => {
  beforeEach(() => {
    mockSecureStore.items.clear();
    jest.clearAllMocks();
  });

  it('stores a trimmed key per provider in the device keystore only on this device', async () => {
    await SecretStore.setApiKey('openai', '  openai-test-key  ');

    expect(await SecretStore.getApiKey('openai')).toBe('openai-test-key');
    expect(await SecretStore.getApiKey('anthropic')).toBeNull();
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('apiKey.openai', 'openai-test-key', {
      keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    });
  });

  it('deletes a key, also when an empty key is saved', async () => {
    await SecretStore.setApiKey('google', 'g-key');
    await SecretStore.setApiKey('meta', 'm-key');

    await SecretStore.deleteApiKey('google');
    await SecretStore.setApiKey('meta', '   ');

    expect(await SecretStore.getApiKey('google')).toBeNull();
    expect(await SecretStore.getApiKey('meta')).toBeNull();
    expect(mockSecureStore.items.size).toBe(0);
  });

  it('lists providers that have a key configured', async () => {
    await SecretStore.setApiKey('anthropic', 'a-key');
    await SecretStore.setApiKey('meta', 'm-key');

    expect(await SecretStore.configuredProviders()).toEqual(['anthropic', 'meta']);
  });
});
