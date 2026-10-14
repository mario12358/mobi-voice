import type { CloudProvider } from '../state/SecretStore';
import { AnthropicEngine } from './AnthropicEngine';
import { CloudHttpClient, type FetchLike } from './CloudHttpClient';
import { GeminiEngine } from './GeminiEngine';
import { META_LLAMA_CONFIG, OPENAI_CONFIG, OpenAiCompatibleEngine } from './OpenAiCompatibleEngine';
import type { CloudLlmEngine } from './types';

// Keys live in the Keychain/Keystore (SecretStore); tests use a memory store.
export interface ApiKeyStore {
  getApiKey(provider: CloudProvider): Promise<string | null>;
  setApiKey(provider: CloudProvider, apiKey: string): Promise<void>;
  deleteApiKey(provider: CloudProvider): Promise<void>;
}

export const PROVIDER_NAMES: Record<CloudProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  meta: 'Meta Llama',
};

export function createCloudEngines(
  fetch: FetchLike,
  keys: ApiKeyStore,
): Record<CloudProvider, CloudLlmEngine> {
  const client = new CloudHttpClient({ fetch });
  const keyOf = (provider: CloudProvider) => () => keys.getApiKey(provider);
  return {
    openai: new OpenAiCompatibleEngine(client, keyOf('openai'), OPENAI_CONFIG),
    anthropic: new AnthropicEngine(client, keyOf('anthropic')),
    google: new GeminiEngine(client, keyOf('google')),
    meta: new OpenAiCompatibleEngine(client, keyOf('meta'), META_LLAMA_CONFIG),
  };
}
