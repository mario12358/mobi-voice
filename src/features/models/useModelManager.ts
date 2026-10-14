import { useCallback, useEffect, useRef, useState } from 'react';

import { isDomainError, type DomainError } from '../../core/errors';
import { MODEL_CATALOG, type CatalogEntry } from '../../models/catalog';
import { isNotRecommended } from '../../models/deviceCapabilities';
import type { ModelStatus } from '../../models/download/types';
import { useServices } from '../../services/ServicesProvider';

// Models the user picks; shared assets (eSpeak data of the voices) come along with them.
export const MANAGED_MODELS = MODEL_CATALOG.filter((entry) => entry.kind !== 'asset');

export interface ModelView {
  entry: CatalogEntry;
  status: ModelStatus | null;
  // 0–100 while downloading, null otherwise.
  progress: number | null;
  notRecommended: boolean;
}

// A question the screen must ask before the download can go on.
export type DownloadQuestion = 'not_recommended' | 'cellular';

export interface ModelManager {
  models: ModelView[];
  error: DomainError | null;
  // Resolves to the question to ask, or null when the download ran (or was cancelled).
  download(entry: CatalogEntry, answered?: DownloadQuestion[]): Promise<DownloadQuestion | null>;
  cancel(entry: CatalogEntry): void;
  remove(entry: CatalogEntry): Promise<void>;
}

export function useModelManager(): ModelManager {
  const services = useServices();
  const [statuses, setStatuses] = useState<Record<string, ModelStatus>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<DomainError | null>(null);
  const downloads = useRef(new Map<string, AbortController>());
  const memory = services.deviceMemoryBytes();

  const refresh = useCallback(
    async (entry: CatalogEntry) => {
      const status = await services.downloads.status(entry.id);
      setStatuses((current) => ({ ...current, [entry.id]: status }));
    },
    [services],
  );

  useEffect(() => {
    void Promise.all(MANAGED_MODELS.map(refresh));
    const running = downloads.current;
    return () => running.forEach((controller) => controller.abort());
  }, [refresh]);

  const download = useCallback(
    async (entry: CatalogEntry, answered: DownloadQuestion[] = []) => {
      if (isNotRecommended(entry, memory) && !answered.includes('not_recommended')) return 'not_recommended';
      const controller = new AbortController();
      downloads.current.set(entry.id, controller);
      setError(null);
      setProgress((current) => ({ ...current, [entry.id]: 0 }));
      try {
        await services.downloads.download(entry.id, {
          allowCellular: answered.includes('cellular'),
          signal: controller.signal,
          onProgress: ({ receivedBytes, totalBytes }) =>
            setProgress((current) => ({
              ...current,
              [entry.id]: Math.floor((receivedBytes / Math.max(1, totalBytes)) * 100),
            })),
        });
        return null;
      } catch (failure) {
        if (!isDomainError(failure)) throw failure;
        if (failure.code === 'cellular_consent_required') return 'cellular';
        if (failure.code !== 'download_cancelled') setError(failure);
        return null;
      } finally {
        downloads.current.delete(entry.id);
        setProgress(({ [entry.id]: _, ...rest }) => rest);
        await refresh(entry);
      }
    },
    [memory, refresh, services],
  );

  const cancel = useCallback((entry: CatalogEntry) => downloads.current.get(entry.id)?.abort(), []);

  const remove = useCallback(
    async (entry: CatalogEntry) => {
      await services.downloads.delete(entry.id);
      await refresh(entry);
    },
    [refresh, services],
  );

  const models = MANAGED_MODELS.map((entry) => ({
    entry,
    status: statuses[entry.id] ?? null,
    progress: progress[entry.id] ?? null,
    notRecommended: isNotRecommended(entry, memory),
  }));

  return { models, error, download, cancel, remove };
}
