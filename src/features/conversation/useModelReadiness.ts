import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { isDomainError, type DomainError } from '../../core/errors';
import type { Topic } from '../../db/repositories/TopicRepository';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes } from '../../models/catalog';
import { isCloudModel, type ChatModel } from '../../models/chatModel';
import { useServices } from '../../services/ServicesProvider';

export interface ModelReadiness {
  model: ChatModel;
  ready: boolean | null;
  // 0–100 while downloading, null otherwise.
  progress: number | null;
  error: DomainError | null;
  download(): Promise<void>;
}

export function formatSize(bytes: number): string {
  return `${(bytes / 1_000_000_000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} GB`;
}

function askCellularConsent(size: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(pl.conversation.cellularTitle, pl.conversation.cellularMessage(size), [
      { text: pl.conversation.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: pl.conversation.cellularConfirm, onPress: () => resolve(true) },
    ]),
  );
}

export function useModelReadiness(topic: Topic | null): ModelReadiness {
  const services = useServices();
  const model = services.modelForTopic(topic);
  const [ready, setReady] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<DomainError | null>(null);

  useEffect(() => {
    let active = true;
    services.isModelReady(model).then((value) => active && setReady(value));
    return () => {
      active = false;
    };
  }, [model, services]);

  const run = useCallback(
    (allowCellular: boolean) =>
      services.downloads.download(model.id, {
        allowCellular,
        onProgress: ({ receivedBytes, totalBytes }) =>
          setProgress(Math.floor((receivedBytes / Math.max(1, totalBytes)) * 100)),
      }),
    [model, services],
  );

  const download = useCallback(async () => {
    // Cloud models are not downloaded; they need an API key instead.
    if (isCloudModel(model)) return;
    setError(null);
    setProgress(0);
    try {
      try {
        await run(false);
      } catch (failure) {
        const needsConsent = isDomainError(failure) && failure.code === 'cellular_consent_required';
        if (!needsConsent) throw failure;
        if (!(await askCellularConsent(formatSize(downloadSizeBytes(model.id))))) return;
        await run(true);
      }
      setReady(true);
    } catch (failure) {
      if (isDomainError(failure)) setError(failure);
      else throw failure;
    } finally {
      setProgress(null);
    }
  }, [model, run]);

  return { model, ready, progress, error, download };
}
