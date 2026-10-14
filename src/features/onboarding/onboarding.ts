import { DEFAULT_LOCAL_MODEL_ID } from '../../engines/llm/createLocalLlmEngine';
import { catalogEntry, sttEntry, ttsEntry, type CatalogEntry } from '../../models/catalog';
import type { ModelStatus } from '../../models/download/types';
import { settingsLoaded, useSettingsStore, type TtsVoice } from '../../state/settings';

// What voice conversation needs on the phone (MV-MOD-3): whisper, one voice and one language model.
export function onboardingModels(voice: TtsVoice): CatalogEntry[] {
  const llm = catalogEntry(DEFAULT_LOCAL_MODEL_ID);
  if (llm === undefined) throw new Error('Default local model missing from the catalog');
  return [sttEntry('small'), ttsEntry(voice), llm];
}

// The wizard shows once: until finished or skipped, and only while the default models are missing.
export async function needsOnboarding(status: (id: string) => Promise<ModelStatus>): Promise<boolean> {
  await settingsLoaded();
  const settings = useSettingsStore.getState();
  if (settings.onboardingDone) return false;
  const statuses = await Promise.all(onboardingModels(settings.ttsVoice).map((entry) => status(entry.id)));
  if (statuses.every((value) => value === 'downloaded')) {
    settings.update({ onboardingDone: true });
    return false;
  }
  return true;
}
