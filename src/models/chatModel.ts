import { selectedLocalModel } from '../engines/llm/createLocalLlmEngine';
import { CLOUD_PROVIDERS, type CloudProvider } from '../state/SecretStore';
import type { LlmEntry } from './catalog';

// A cloud model the user reaches with their own key; the provider keeps the whole conversation in view.
export interface CloudModel {
  kind: 'cloud';
  // `cloud:<provider>:<model>`, stored like a catalog id in settings and topic overrides.
  id: string;
  provider: CloudProvider;
  model: string;
  displayName: string;
  contextTokens: number;
  maxOutputTokens: number;
}

export type ChatModel = LlmEntry | CloudModel;

// Cloud models take far more context than phones; this keeps whole conversations without summaries.
const CLOUD_CONTEXT_TOKENS = 100_000;
const CLOUD_MAX_OUTPUT_TOKENS = 1_024;

const CLOUD_PREFIX = 'cloud:';

export function cloudModelId(provider: CloudProvider, model: string): string {
  return `${CLOUD_PREFIX}${provider}:${model}`;
}

export function parseCloudModelId(id: string): { provider: CloudProvider; model: string } | null {
  if (!id.startsWith(CLOUD_PREFIX)) return null;
  const rest = id.slice(CLOUD_PREFIX.length);
  const colon = rest.indexOf(':');
  const provider = rest.slice(0, colon) as CloudProvider;
  const model = rest.slice(colon + 1);
  if (colon <= 0 || model.length === 0 || !CLOUD_PROVIDERS.includes(provider)) return null;
  return { provider, model };
}

export function cloudModel(provider: CloudProvider, model: string): CloudModel {
  return {
    kind: 'cloud',
    id: cloudModelId(provider, model),
    provider,
    model,
    displayName: model,
    contextTokens: CLOUD_CONTEXT_TOKENS,
    maxOutputTokens: CLOUD_MAX_OUTPUT_TOKENS,
  };
}

// Settings and topic overrides hold either a catalog id or a cloud model id.
export function resolveChatModel(id: string | null): ChatModel {
  const cloud = id === null ? null : parseCloudModelId(id);
  return cloud === null ? selectedLocalModel(id) : cloudModel(cloud.provider, cloud.model);
}

export function isCloudModel(model: ChatModel): model is CloudModel {
  return model.kind === 'cloud';
}
