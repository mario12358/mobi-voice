import { CAPTURE_SAMPLE_RATE, NativeMicrophone, nativeAudio } from './audio/NativeMicrophone';
import { EnergyVadEngine } from './fakes/EnergyVadEngine';
import { FakeKeywordSpotter } from './fakes/FakeKeywordSpotter';
import { E2E_SCRIPT, FakeLlmEngine } from './fakes/FakeLlmEngine';
import { E2E_TRANSCRIPT, FakeSttEngine } from './fakes/FakeSttEngine';
import { FakeTtsEngine } from './fakes/FakeTtsEngine';
import { WavAudioSource } from './fakes/WavAudioSource';
import { SherpaKeywordSpotter } from './kws/SherpaKeywordSpotter';
import { createLocalLlmEngine } from './llm/createLocalLlmEngine';
import { createWhisperSttEngine } from './stt/createWhisperSttEngine';
import { createPiperTtsEngine } from './tts/createPiperTtsEngine';
import { EndpointingVad } from './vad/EndpointingVad';
import { SileroSpeechDetector } from './vad/SileroSpeechDetector';
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
    stt: () => new FakeSttEngine([], E2E_TRANSCRIPT),
    tts: () => new FakeTtsEngine(500),
    vad: () => new EnergyVadEngine(),
    keywordSpotter: () => new FakeKeywordSpotter(),
    audioSource: () => new WavAudioSource(),
  };
}

export const PRODUCTION_FACTORIES: EngineFactories = {
  llm: createLocalLlmEngine,
  stt: createWhisperSttEngine,
  tts: createPiperTtsEngine,
  vad: () => new EndpointingVad(new SileroSpeechDetector(CAPTURE_SAMPLE_RATE)),
  keywordSpotter: () => new SherpaKeywordSpotter(nativeAudio, CAPTURE_SAMPLE_RATE),
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
