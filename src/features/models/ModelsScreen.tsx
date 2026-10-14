import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes, type CatalogEntry } from '../../models/catalog';
import { useSettingsStore } from '../../state/settings';
import { SPACING, usePalette } from '../../theme/theme';
import { formatSize } from '../conversation/useModelReadiness';
import { useDownloadQuestions } from './useDownloadQuestions';
import { useModelManager, type ModelView } from './useModelManager';

const SECTIONS: { kind: CatalogEntry['kind']; title: string }[] = [
  { kind: 'llm', title: pl.models.sectionLlm },
  { kind: 'stt', title: pl.models.sectionStt },
  { kind: 'tts', title: pl.models.sectionTts },
];

const STATUS_LABEL = {
  downloaded: pl.models.downloaded,
  missing: pl.models.missing,
  partial: pl.models.partial,
} as const;

interface RowProps {
  model: ModelView;
  onDownload(): void;
  onCancel(): void;
  onDelete(): void;
}

function ModelRow({ model, onDownload, onCancel, onDelete }: RowProps) {
  const palette = usePalette();
  const { entry, status, progress } = model;
  return (
    <View testID={`models.row-${entry.id}`} style={[styles.row, { borderColor: palette.border }]}>
      <Text style={[styles.name, { color: palette.textPrimary }]}>{entry.displayName}</Text>
      <BodyText>{pl.models.size(formatSize(downloadSizeBytes(entry.id)))}</BodyText>
      {model.notRecommended && (
        <Text
          testID={`models.not-recommended-${entry.id}`}
          style={[styles.warning, { color: palette.accent }]}
        >
          {pl.models.notRecommended}
        </Text>
      )}
      {progress !== null ? (
        <View style={styles.actions}>
          <BodyText testID={`models.progress-${entry.id}`}>{pl.models.progress(progress)}</BodyText>
          <TextButton testID={`models.cancel-${entry.id}`} label={pl.models.cancel} onPress={onCancel} />
        </View>
      ) : (
        <View style={styles.actions}>
          {status !== null && (
            <BodyText testID={`models.status-${entry.id}`}>{STATUS_LABEL[status]}</BodyText>
          )}
          {status === 'downloaded' ? (
            <TextButton testID={`models.delete-${entry.id}`} label={pl.models.delete} onPress={onDelete} />
          ) : (
            status !== null && (
              <TextButton
                testID={`models.download-${entry.id}`}
                label={status === 'partial' ? pl.models.resume : pl.models.download}
                onPress={onDownload}
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

function WifiOnlySwitch() {
  const palette = usePalette();
  const wifiOnly = useSettingsStore((state) => state.wifiOnlyDownloads);
  const update = useSettingsStore((state) => state.update);
  return (
    <View style={styles.section}>
      <View style={styles.switchRow}>
        <Text style={[styles.name, { color: palette.textPrimary }]}>{pl.models.wifiOnly}</Text>
        <Switch
          testID="models.wifi-only"
          accessibilityLabel={pl.models.wifiOnly}
          value={wifiOnly}
          onValueChange={(value) => update({ wifiOnlyDownloads: value })}
        />
      </View>
      <BodyText>{pl.models.wifiOnlyHint}</BodyText>
    </View>
  );
}

// Model manager (MV-MOD-1, MV-MOD-4): download, resume, cancel and delete on-device models.
export function ModelsScreen() {
  const palette = usePalette();
  const manager = useModelManager();
  const questions = useDownloadQuestions(manager);
  const [deleting, setDeleting] = useState<CatalogEntry | null>(null);

  async function confirmDelete() {
    if (deleting === null) return;
    const entry = deleting;
    setDeleting(null);
    await manager.remove(entry);
  }

  return (
    <Screen testID="models-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <WifiOnlySwitch />
        {manager.error !== null && (
          <Text accessibilityRole="alert" style={[styles.warning, { color: palette.accent }]}>
            {manager.error.userMessage}
          </Text>
        )}
        {SECTIONS.map((section) => (
          <View key={section.kind} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
              {section.title}
            </Text>
            {manager.models
              .filter((model) => model.entry.kind === section.kind)
              .map((model) => (
                <ModelRow
                  key={model.entry.id}
                  model={model}
                  onDownload={() => void questions.download(model.entry)}
                  onCancel={() => manager.cancel(model.entry)}
                  onDelete={() => setDeleting(model.entry)}
                />
              ))}
          </View>
        ))}
      </ScrollView>
      {questions.dialog}
      {deleting !== null && (
        <ConfirmDialog
          testID="models.delete-dialog"
          title={pl.models.deleteTitle}
          message={pl.models.deleteMessage(deleting.displayName, formatSize(downloadSizeBytes(deleting.id)))}
          confirmLabel={pl.models.delete}
          cancelLabel={pl.models.cancel}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.lg, paddingBottom: SPACING.lg },
  section: { gap: SPACING.sm },
  heading: { fontSize: 17, fontWeight: '600' },
  row: { borderWidth: 1, borderRadius: 8, padding: SPACING.md, gap: SPACING.xs },
  name: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  warning: { fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
