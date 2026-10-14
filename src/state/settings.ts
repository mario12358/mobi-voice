import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type TtsVoice = 'darkman' | 'gosia';
export type ConversationMode = 'continuous' | 'interrupted';
export type WhisperVariant = 'small' | 'base';

export const SILENCE_THRESHOLD_MIN_MS = 1_500;
export const SILENCE_THRESHOLD_MAX_MS = 6_000;

// API keys never live here — this object is persisted in plain AsyncStorage (see SecretStore).
export interface Settings {
  defaultModelId: string | null;
  ttsVoice: TtsVoice;
  conversationMode: ConversationMode;
  silenceThresholdMs: number;
  whisperVariant: WhisperVariant;
  globalSystemPrompt: string | null;
  diagnosticsEnabled: boolean;
  wifiOnlyDownloads: boolean;
  crashReportsConsent: boolean;
  // The first-run wizard (MV-MOD-3) was finished or skipped.
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultModelId: null,
  ttsVoice: 'gosia',
  conversationMode: 'continuous',
  silenceThresholdMs: 3_000,
  whisperVariant: 'small',
  globalSystemPrompt: null,
  diagnosticsEnabled: false,
  wifiOnlyDownloads: true,
  crashReportsConsent: false,
  onboardingDone: false,
};

interface SettingsActions {
  update(changes: Partial<Settings>): void;
  reset(): void;
}

export type SettingsState = Settings & SettingsActions;

export const SETTINGS_STORAGE_KEY = 'mobivoice-settings';

export function clampSilenceThreshold(milliseconds: number): number {
  if (!Number.isFinite(milliseconds)) return DEFAULT_SETTINGS.silenceThresholdMs;
  return Math.min(SILENCE_THRESHOLD_MAX_MS, Math.max(SILENCE_THRESHOLD_MIN_MS, Math.round(milliseconds)));
}

function sanitize(changes: Partial<Settings>): Partial<Settings> {
  if (changes.silenceThresholdMs === undefined) return changes;
  return { ...changes, silenceThresholdMs: clampSilenceThreshold(changes.silenceThresholdMs) };
}

function pickSettings(state: SettingsState): Settings {
  return {
    defaultModelId: state.defaultModelId,
    ttsVoice: state.ttsVoice,
    conversationMode: state.conversationMode,
    silenceThresholdMs: state.silenceThresholdMs,
    whisperVariant: state.whisperVariant,
    globalSystemPrompt: state.globalSystemPrompt,
    diagnosticsEnabled: state.diagnosticsEnabled,
    wifiOnlyDownloads: state.wifiOnlyDownloads,
    crashReportsConsent: state.crashReportsConsent,
    onboardingDone: state.onboardingDone,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (changes) => set(sanitize(changes)),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: pickSettings,
    },
  ),
);

// Settings live in AsyncStorage and load asynchronously: decisions taken at start-up wait for them.
export function settingsLoaded(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
