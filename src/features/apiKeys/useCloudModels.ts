import { useEffect, useState } from 'react';

import { cloudModel, type CloudModel } from '../../models/chatModel';
import { useServices } from '../../services/ServicesProvider';
import { CLOUD_PROVIDERS } from '../../state/SecretStore';

// Cloud models of the providers with a saved key, for the model choices (MV-CLOUD-1).
export function useCloudModels(): CloudModel[] {
  const { cloud } = useServices();
  const [models, setModels] = useState<CloudModel[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all(
      CLOUD_PROVIDERS.map(async (provider) => {
        if ((await cloud.keys.getApiKey(provider)) === null) return [];
        return (await cloud.engines[provider].listModels()).map((model) => cloudModel(provider, model));
      }),
    ).then((lists) => active && setModels(lists.flat()));
    return () => {
      active = false;
    };
  }, [cloud]);

  return models;
}
