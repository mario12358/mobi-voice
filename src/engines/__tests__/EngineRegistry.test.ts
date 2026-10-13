import { DomainError } from '../../core/errors';
import { createEngineRegistry, resolveEngineMode } from '../EngineRegistry';
import { EnergyVadEngine } from '../fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from '../fakes/FakeKeywordSpotter';
import { FakeLlmEngine } from '../fakes/FakeLlmEngine';
import { FakeSttEngine } from '../fakes/FakeSttEngine';
import { FakeTtsEngine } from '../fakes/FakeTtsEngine';
import { WavAudioSource } from '../fakes/WavAudioSource';
import { LocalLlmEngine } from '../llm/LocalLlmEngine';

describe('EngineRegistry', () => {
  it.each([
    ['1', 'test'],
    [undefined, 'production'],
    ['0', 'production'],
    ['true', 'production'],
  ])('build flag %p selects %s engines', (flag, mode) => {
    expect(resolveEngineMode(flag)).toBe(mode);
  });

  it('serves deterministic fakes in test mode, one instance per engine', () => {
    const registry = createEngineRegistry('test');

    expect(registry.llm()).toBeInstanceOf(FakeLlmEngine);
    expect(registry.stt()).toBeInstanceOf(FakeSttEngine);
    expect(registry.tts()).toBeInstanceOf(FakeTtsEngine);
    expect(registry.vad()).toBeInstanceOf(EnergyVadEngine);
    expect(registry.keywordSpotter()).toBeInstanceOf(FakeKeywordSpotter);
    expect(registry.audioSource()).toBeInstanceOf(WavAudioSource);
    expect(registry.llm()).toBe(registry.llm());
  });

  it('never falls back to fakes in production mode', () => {
    const registry = createEngineRegistry('production');
    expect(registry.llm()).toBeInstanceOf(LocalLlmEngine);
    expect(registry.llm()).not.toBeInstanceOf(FakeLlmEngine);
    expect(() => registry.audioSource()).toThrow(DomainError);
    expect(() => registry.audioSource()).toThrow(expect.objectContaining({ code: 'engine_unavailable' }));
  });
});
