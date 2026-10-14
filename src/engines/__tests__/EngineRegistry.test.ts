import { NativeMicrophone } from '../audio/NativeMicrophone';
import { createEngineRegistry, resolveEngineMode } from '../EngineRegistry';
import { EnergyVadEngine } from '../fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from '../fakes/FakeKeywordSpotter';
import { FakeLlmEngine } from '../fakes/FakeLlmEngine';
import { FakeSttEngine } from '../fakes/FakeSttEngine';
import { FakeTtsEngine } from '../fakes/FakeTtsEngine';
import { WavAudioSource } from '../fakes/WavAudioSource';
import { SherpaKeywordSpotter } from '../kws/SherpaKeywordSpotter';
import { LocalLlmEngine } from '../llm/LocalLlmEngine';
import { WhisperSttEngine } from '../stt/WhisperSttEngine';
import { PiperTtsEngine } from '../tts/PiperTtsEngine';

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
    expect(registry.audioSource()).toBeInstanceOf(NativeMicrophone);
    expect(registry.stt()).toBeInstanceOf(WhisperSttEngine);
    expect(registry.tts()).toBeInstanceOf(PiperTtsEngine);
    expect(registry.keywordSpotter()).toBeInstanceOf(SherpaKeywordSpotter);
    expect(registry.vad()).not.toBeInstanceOf(EnergyVadEngine);
  });
});
