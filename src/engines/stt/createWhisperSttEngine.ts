// whisper.rn's package exports have no "." entry, only subpaths.
import { initWhisper } from 'whisper.rn/index';
import { Platform } from 'react-native';

import { sttEntry } from '../../models/catalog';
import { blobUtilFileSystem } from '../../models/download/blobUtilFileSystem';
import { expoNetworkInfo } from '../../models/download/expoNetworkInfo';
import { ModelDownloadService } from '../../models/download/ModelDownloadService';
import { useSettingsStore } from '../../state/settings';
import { WhisperSttEngine, type WhisperContextLike } from './WhisperSttEngine';

export function createWhisperSttEngine(): WhisperSttEngine {
  const downloads = new ModelDownloadService(blobUtilFileSystem, expoNetworkInfo, {
    wifiOnly: () => useSettingsStore.getState().wifiOnlyDownloads,
  });
  return new WhisperSttEngine(
    {
      currentModel: () => sttEntry(useSettingsStore.getState().whisperVariant),
      async modelPath(entry) {
        const file = entry.files[0];
        if (file === undefined || (await downloads.status(entry.id)) !== 'downloaded') return null;
        return downloads.modelPath(entry.id, file);
      },
    },
    // Metal on iOS; whisper.rn has no GPU path on Android.
    (modelPath) =>
      initWhisper({ filePath: modelPath, useGpu: Platform.OS === 'ios' }) as Promise<WhisperContextLike>,
  );
}
