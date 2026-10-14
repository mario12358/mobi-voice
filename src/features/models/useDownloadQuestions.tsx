import { useState, type ReactNode } from 'react';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes, type CatalogEntry } from '../../models/catalog';
import { formatSize } from '../conversation/useModelReadiness';
import type { DownloadQuestion, ModelManager } from './useModelManager';

interface Pending {
  entry: CatalogEntry;
  question: DownloadQuestion;
  answered: DownloadQuestion[];
  resolve: (started: boolean) => void;
}

export interface DownloadWithQuestions {
  // Resolves when the download ended (true) or the user declined a question (false).
  download(entry: CatalogEntry): Promise<boolean>;
  dialog: ReactNode;
}

// Asks the questions a download may need (model too big for the phone, cellular data) in an in-app dialog.
export function useDownloadQuestions(manager: Pick<ModelManager, 'download'>): DownloadWithQuestions {
  const [pending, setPending] = useState<Pending | null>(null);

  function run(entry: CatalogEntry, answered: DownloadQuestion[]): Promise<boolean> {
    return manager
      .download(entry, answered)
      .then((question) =>
        question === null
          ? true
          : new Promise<boolean>((resolve) => setPending({ entry, question, answered, resolve })),
      );
  }

  function answer(accepted: boolean) {
    if (pending === null) return;
    setPending(null);
    if (!accepted) {
      pending.resolve(false);
      return;
    }
    void run(pending.entry, [...pending.answered, pending.question]).then(pending.resolve);
  }

  const dialog =
    pending === null ? null : (
      <ConfirmDialog
        testID="models.confirm-download"
        title={pending.question === 'cellular' ? pl.models.cellularTitle : pl.models.notRecommendedTitle}
        message={
          pending.question === 'cellular'
            ? pl.models.cellularMessage(formatSize(downloadSizeBytes(pending.entry.id)))
            : pl.models.notRecommendedMessage(pending.entry.displayName)
        }
        confirmLabel={pending.question === 'cellular' ? pl.models.cellularConfirm : pl.models.downloadAnyway}
        cancelLabel={pl.models.cancel}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      />
    );

  return { download: (entry) => run(entry, []), dialog };
}
