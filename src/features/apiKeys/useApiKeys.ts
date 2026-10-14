import { useCallback, useEffect, useState } from 'react';

import { isDomainError, type DomainError } from '../../core/errors';
import { useServices } from '../../services/ServicesProvider';
import { CLOUD_PROVIDERS, type CloudProvider } from '../../state/SecretStore';

export interface ProviderView {
  provider: CloudProvider;
  configured: boolean;
  models: string[];
  saving: boolean;
  error: DomainError | null;
}

export interface ApiKeys {
  providers: ProviderView[];
  // Checks the key with a test request first; a refused key is not stored (MV-CLOUD-1).
  save(provider: CloudProvider, apiKey: string): Promise<boolean>;
  remove(provider: CloudProvider): Promise<void>;
}

const EMPTY: Omit<ProviderView, 'provider'> = { configured: false, models: [], saving: false, error: null };

export function useApiKeys(): ApiKeys {
  const { cloud } = useServices();
  const [state, setState] = useState<Record<CloudProvider, Omit<ProviderView, 'provider'>>>({
    openai: EMPTY,
    anthropic: EMPTY,
    google: EMPTY,
    meta: EMPTY,
  });

  const patch = useCallback(
    (provider: CloudProvider, changes: Partial<Omit<ProviderView, 'provider'>>) =>
      setState((current) => ({ ...current, [provider]: { ...current[provider], ...changes } })),
    [],
  );

  const refresh = useCallback(
    async (provider: CloudProvider) => {
      const configured = (await cloud.keys.getApiKey(provider)) !== null;
      patch(provider, { configured, models: configured ? await cloud.engines[provider].listModels() : [] });
    },
    [cloud, patch],
  );

  useEffect(() => {
    void Promise.all(CLOUD_PROVIDERS.map(refresh));
  }, [refresh]);

  const save = useCallback(
    async (provider: CloudProvider, apiKey: string) => {
      const key = apiKey.trim();
      if (key.length === 0) return false;
      patch(provider, { saving: true, error: null });
      try {
        await cloud.engines[provider].validateKey(key);
        await cloud.keys.setApiKey(provider, key);
        await refresh(provider);
        return true;
      } catch (failure) {
        if (!isDomainError(failure)) throw failure;
        patch(provider, { error: failure });
        return false;
      } finally {
        patch(provider, { saving: false });
      }
    },
    [cloud, patch, refresh],
  );

  const remove = useCallback(
    async (provider: CloudProvider) => {
      await cloud.keys.deleteApiKey(provider);
      patch(provider, { configured: false, models: [], error: null });
    },
    [cloud, patch],
  );

  return { providers: CLOUD_PROVIDERS.map((provider) => ({ provider, ...state[provider] })), save, remove };
}
