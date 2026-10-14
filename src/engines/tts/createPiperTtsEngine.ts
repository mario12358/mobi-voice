import { catalogEntry, ttsEntry, type TtsEntry } from '../../models/catalog';
import { blobUtilFileSystem } from '../../models/download/blobUtilFileSystem';
import { expoNetworkInfo } from '../../models/download/expoNetworkInfo';
import { ModelDownloadService } from '../../models/download/ModelDownloadService';
import { useSettingsStore } from '../../state/settings';
import { nativeAudio } from '../audio/NativeMicrophone';
import { PiperTtsEngine, type PiperFiles } from './PiperTtsEngine';

const ESPEAK_ENTRY_ID = 'espeak-ng-data-pl';

export function createPiperTtsEngine(): PiperTtsEngine {
  const downloads = new ModelDownloadService(blobUtilFileSystem, expoNetworkInfo, {
    wifiOnly: () => useSettingsStore.getState().wifiOnlyDownloads,
  });

  async function files(entry: TtsEntry): Promise<PiperFiles | null> {
    const espeak = catalogEntry(ESPEAK_ENTRY_ID);
    const [model, tokens] = entry.files;
    const phontab = espeak?.files.find((file) => file.path.endsWith('/phontab'));
    if (model === undefined || tokens === undefined || espeak === undefined || phontab === undefined)
      return null;
    const ready = await Promise.all([downloads.status(entry.id), downloads.status(espeak.id)]);
    if (ready.some((status) => status !== 'downloaded')) return null;
    const phontabPath = downloads.modelPath(espeak.id, phontab);
    return {
      model: downloads.modelPath(entry.id, model),
      tokens: downloads.modelPath(entry.id, tokens),
      dataDir: phontabPath.slice(0, phontabPath.lastIndexOf('/')),
    };
  }

  return new PiperTtsEngine(
    { currentVoice: () => ttsEntry(useSettingsStore.getState().ttsVoice), files },
    {
      loadTts: (model, tokens, dataDir) => nativeAudio().loadTts(model, tokens, dataDir),
      synthesize: (text) => nativeAudio().synthesize(text),
      play: (data, sampleRate) => nativeAudio().play(data, sampleRate),
      stopPlayback: () => nativeAudio().stopPlayback(),
    },
  );
}
