import { FakeLlmEngine } from '../../engines/fakes/FakeLlmEngine';
import type { LlmRequest } from '../../engines/types';
import { RoutingLlmEngine } from '../RoutingLlmEngine';
import type { CloudLlmEngine } from '../types';

function cloudEngine(provider: CloudLlmEngine['provider']) {
  const requests: LlmRequest[] = [];
  const engine: CloudLlmEngine = {
    provider,
    generate: async (request) => {
      requests.push(request);
      return { text: provider, aborted: false };
    },
    listModels: async () => [],
    validateKey: async () => {},
  };
  return { engine, requests };
}

describe('RoutingLlmEngine', () => {
  const local = new FakeLlmEngine(() => 'lokalnie');
  const openai = cloudEngine('openai');
  const anthropic = cloudEngine('anthropic');
  const router = new RoutingLlmEngine(() => local, {
    openai: openai.engine,
    anthropic: anthropic.engine,
    google: cloudEngine('google').engine,
    meta: cloudEngine('meta').engine,
  });
  const base: LlmRequest = { systemPrompt: null, messages: [{ role: 'user', content: 'Hej' }] };

  it('sends cloud models to their provider with the provider model name', async () => {
    const result = await router.generate(
      { ...base, model: 'cloud:anthropic:claude-haiku-5-5' },
      () => undefined,
      new AbortController().signal,
    );

    expect(result.text).toBe('anthropic');
    expect(anthropic.requests[0]?.model).toBe('claude-haiku-5-5');
  });

  it('keeps local models and requests without a model on the phone', async () => {
    await expect(
      router.generate({ ...base, model: 'qwen2.5-1.5b' }, () => undefined, new AbortController().signal),
    ).resolves.toMatchObject({ text: 'lokalnie' });
    await expect(router.generate(base, () => undefined, new AbortController().signal)).resolves.toMatchObject(
      {
        text: 'lokalnie',
      },
    );
    expect(openai.requests).toHaveLength(0);
  });
});
