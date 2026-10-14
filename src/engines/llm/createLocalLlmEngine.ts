import { initLlama } from 'llama.rn';
import { Platform } from 'react-native';

import { catalogEntry, llmEntries, type LlmEntry } from '../../models/catalog';
import { blobUtilFileSystem } from '../../models/download/blobUtilFileSystem';
import { expoNetworkInfo } from '../../models/download/expoNetworkInfo';
import { ModelDownloadService } from '../../models/download/ModelDownloadService';
import { useSettingsStore } from '../../state/settings';
import { LlamaContextSlot, type InitLlama } from './LlamaContextSlot';
import { LocalLlmEngine } from './LocalLlmEngine';

export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-1.5b';

// Metal on iOS takes all layers; Android stays on the CPU (OpenCL/Hexagon not enabled in the build).
const GPU_LAYERS = Platform.OS === 'ios' ? 99 : 0;

export function selectedLocalModel(modelId: string | null): LlmEntry {
  const entry = catalogEntry(modelId ?? DEFAULT_LOCAL_MODEL_ID);
  if (entry?.kind === 'llm') return entry;
  const fallback = llmEntries().find((model) => model.id === DEFAULT_LOCAL_MODEL_ID);
  if (fallback === undefined) throw new Error('Default local model missing from the catalog');
  return fallback;
}

export function createLocalLlmEngine(): LocalLlmEngine {
  const downloads = new ModelDownloadService(blobUtilFileSystem, expoNetworkInfo, {
    wifiOnly: () => useSettingsStore.getState().wifiOnlyDownloads,
  });
  const slot = new LlamaContextSlot(initLlama as unknown as InitLlama, GPU_LAYERS);
  return new LocalLlmEngine(
    {
      currentModel: (requested) =>
        selectedLocalModel(requested ?? useSettingsStore.getState().defaultModelId),
      async modelPath(entry) {
        const file = entry.files[0];
        if (file === undefined || (await downloads.status(entry.id)) !== 'downloaded') return null;
        return downloads.modelPath(entry.id, file);
      },
    },
    slot,
  );
}
