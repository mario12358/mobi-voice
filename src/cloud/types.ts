import type { LlmEngine } from '../engines/types';
import type { CloudProvider } from '../state/SecretStore';

// A cloud provider's chat model behind the app's LlmEngine, plus what the API keys screen needs.
export interface CloudLlmEngine extends LlmEngine {
  readonly provider: CloudProvider;
  // Model names from the provider's API, or the built-in list when that fails (MV-CLOUD-1).
  listModels(): Promise<string[]>;
  // A small test request with the given key; rejects with invalid_api_key when the provider refuses it.
  validateKey(apiKey: string): Promise<void>;
}

export type ApiKeySource = () => Promise<string | null>;
