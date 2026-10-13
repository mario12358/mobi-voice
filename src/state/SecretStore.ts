import * as SecureStore from 'expo-secure-store';

export type CloudProvider = 'openai' | 'anthropic' | 'google' | 'meta';

export const CLOUD_PROVIDERS: readonly CloudProvider[] = ['openai', 'anthropic', 'google', 'meta'];

// Keychain (iOS) / Keystore (Android); the item never syncs to backups of other devices.
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function storageKey(provider: CloudProvider): string {
  return `apiKey.${provider}`;
}

export const SecretStore = {
  async getApiKey(provider: CloudProvider): Promise<string | null> {
    return SecureStore.getItemAsync(storageKey(provider), SECURE_OPTIONS);
  },

  async setApiKey(provider: CloudProvider, apiKey: string): Promise<void> {
    const trimmed = apiKey.trim();
    if (trimmed.length === 0) {
      await SecureStore.deleteItemAsync(storageKey(provider), SECURE_OPTIONS);
      return;
    }
    await SecureStore.setItemAsync(storageKey(provider), trimmed, SECURE_OPTIONS);
  },

  async deleteApiKey(provider: CloudProvider): Promise<void> {
    await SecureStore.deleteItemAsync(storageKey(provider), SECURE_OPTIONS);
  },

  async configuredProviders(): Promise<CloudProvider[]> {
    const keys = await Promise.all(CLOUD_PROVIDERS.map((provider) => SecretStore.getApiKey(provider)));
    return CLOUD_PROVIDERS.filter((_, index) => keys[index] !== null);
  },
};
