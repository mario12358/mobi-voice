import type { ApiKeyStore } from '../cloud/createCloudEngines';
import type { CloudProvider } from '../state/SecretStore';

// e2e builds and Jest: API keys kept in memory instead of the Keychain/Keystore.
export class MemoryApiKeys implements ApiKeyStore {
  readonly keys = new Map<CloudProvider, string>();

  async getApiKey(provider: CloudProvider): Promise<string | null> {
    return this.keys.get(provider) ?? null;
  }

  async setApiKey(provider: CloudProvider, apiKey: string): Promise<void> {
    this.keys.set(provider, apiKey.trim());
  }

  async deleteApiKey(provider: CloudProvider): Promise<void> {
    this.keys.delete(provider);
  }
}
