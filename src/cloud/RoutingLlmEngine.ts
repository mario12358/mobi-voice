import type { LlmEngine, LlmRequest, LlmResult } from '../engines/types';
import { parseCloudModelId } from '../models/chatModel';
import type { CloudProvider } from '../state/SecretStore';
import type { CloudLlmEngine } from './types';

// Sends each request to the engine of its model: a cloud provider for `cloud:…` ids, the phone otherwise.
// A cloud failure is reported as it is — never answered by the local model instead (MV-CLOUD-2).
export class RoutingLlmEngine implements LlmEngine {
  constructor(
    private readonly local: () => LlmEngine,
    private readonly cloud: Record<CloudProvider, CloudLlmEngine>,
  ) {}

  generate(request: LlmRequest, onToken: (token: string) => void, signal: AbortSignal): Promise<LlmResult> {
    const cloud = request.model === undefined ? null : parseCloudModelId(request.model);
    if (cloud === null) return this.local().generate(request, onToken, signal);
    return this.cloud[cloud.provider].generate({ ...request, model: cloud.model }, onToken, signal);
  }
}
