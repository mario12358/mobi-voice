import AsyncStorage from '@react-native-async-storage/async-storage';

import { clampSilenceThreshold, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, useSettingsStore } from '../settings';

async function storedSettings(): Promise<Record<string, unknown>> {
  const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw === null ? {} : (JSON.parse(raw) as { state: Record<string, unknown> }).state;
}

describe('settings store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.getState().reset();
  });

  it('starts with the defaults agreed for the MVP', () => {
    expect(useSettingsStore.getState()).toMatchObject({
      ttsVoice: 'gosia',
      conversationMode: 'continuous',
      silenceThresholdMs: 3_000,
      whisperVariant: 'small',
      wifiOnlyDownloads: true,
      crashReportsConsent: false,
      diagnosticsEnabled: false,
    });
  });

  it('persists changed settings to AsyncStorage without actions', async () => {
    useSettingsStore.getState().update({ ttsVoice: 'darkman', conversationMode: 'interrupted' });

    const stored = await storedSettings();
    expect(stored).toEqual({ ...DEFAULT_SETTINGS, ttsVoice: 'darkman', conversationMode: 'interrupted' });
  });

  it('restores settings saved by a previous app run', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { ...DEFAULT_SETTINGS, whisperVariant: 'base', silenceThresholdMs: 4_500 },
        version: 1,
      }),
    );

    await useSettingsStore.persist.rehydrate();

    expect(useSettingsStore.getState()).toMatchObject({ whisperVariant: 'base', silenceThresholdMs: 4_500 });
  });

  it.each([
    [1_000, 1_500],
    [6_500, 6_000],
    [2_249.6, 2_250],
    [Number.NaN, 3_000],
  ])('keeps the silence threshold %p within 1.5–6 s (%p)', (input, expected) => {
    expect(clampSilenceThreshold(input)).toBe(expected);
    useSettingsStore.getState().update({ silenceThresholdMs: input });
    expect(useSettingsStore.getState().silenceThresholdMs).toBe(expected);
  });
});
