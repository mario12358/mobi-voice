import { DomainError } from '../core/errors';
import { NativeMicrophone } from './audio/NativeMicrophone';
import { EnergyVadEngine } from './fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from './fakes/FakeKeywordSpotter';
import { E2E_SCRIPT, FakeLlmEngine } from './fakes/FakeLlmEngine';
import { FakeSttEngine } from './fakes/FakeSttEngine';
import { FakeTtsEngine } from './fakes/FakeTtsEngine';
import { WavAudioSource } from './fakes/WavAudioSource';
import { createLocalLlmEngine } from './llm/createLocalLlmEngine';
import type { AudioSource, KeywordSpotter, LlmEngine, SttEngine, TtsEngine, VadEngine } from './types';

export type EngineMode = 'production' | 'test';

export interface EngineFactories {
  llm(): LlmEngine;
  stt(): SttEngine;
  tts(): TtsEngine;
  vad(): VadEngine;
  keywordSpotter(): KeywordSpotter;
  audioSource(): AudioSource;
}

type EngineName = keyof EngineFactories;
type Engines = { [Name in EngineName]: ReturnType<EngineFactories[Name]> };

// The e2e build sets EXPO_PUBLIC_E2E=1; Expo inlines it at bundle time.
export function resolveEngineMode(flag: string | undefined): EngineMode {
  return flag === '1' ? 'test' : 'production';
}

export function createTestFactories(): EngineFactories {
  return {
    llm: () => new FakeLlmEngine(E2E_SCRIPT, 60),
    stt: () => new FakeSttEngine(),
    tts: () => new FakeTtsEngine(500),
    vad: () => new EnergyVadEngine(),
    keywordSpotter: () => new FakeKeywordSpotter(),
    audioSource: () => new WavAudioSource(),
  };
}

function unavailable(name: EngineName): never {
  throw new DomainError('engine_unavailable', `Native ${name} engine is not wired yet`);
}

// Native adapters replace these entries as they land (sherpa-onnx 3.2/3.4/4.3, whisper.rn 3.3).
export const PRODUCTION_FACTORIES: EngineFactories = {
  llm: createLocalLlmEngine,
  stt: () => unavailable('stt'),
  tts: () => unavailable('tts'),
  vad: () => unavailable('vad'),
  keywordSpotter: () => unavailable('keywordSpotter'),
  audioSource: () => new NativeMicrophone(),
};

export class EngineRegistry {
  private readonly instances: Partial<Engines> = {};

  constructor(
    readonly mode: EngineMode,
    private readonly factories: EngineFactories,
  ) {}

  llm(): LlmEngine {
    return this.get('llm');
  }

  stt(): SttEngine {
    return this.get('stt');
  }

  tts(): TtsEngine {
    return this.get('tts');
  }

  vad(): VadEngine {
    return this.get('vad');
  }

  keywordSpotter(): KeywordSpotter {
    return this.get('keywordSpotter');
  }

  audioSource(): AudioSource {
    return this.get('audioSource');
  }

  private get<Name extends EngineName>(name: Name): Engines[Name] {
    const existing = this.instances[name];
    if (existing !== undefined) return existing;
    const created = this.factories[name]() as Engines[Name];
    this.instances[name] = created;
    return created;
  }
}

export function createEngineRegistry(mode: EngineMode): EngineRegistry {
  return new EngineRegistry(mode, mode === 'test' ? createTestFactories() : PRODUCTION_FACTORIES);
}
