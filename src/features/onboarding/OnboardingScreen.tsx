import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes, ttsEntry } from '../../models/catalog';
import type { RootScreenProps } from '../../navigation/types';
import { useSettingsStore, type TtsVoice } from '../../state/settings';
import { SPACING, usePalette } from '../../theme/theme';
import { formatSize } from '../conversation/useModelReadiness';
import { useDownloadQuestions } from '../models/useDownloadQuestions';
import { useModelManager, type ModelView } from '../models/useModelManager';
import { onboardingModels } from './onboarding';

const VOICES: TtsVoice[] = ['gosia', 'darkman'];
const STEP_TITLES = [pl.onboarding.stepStt, pl.onboarding.stepVoice, pl.onboarding.stepLlm];

const STATUS_LABEL = {
  downloaded: pl.models.downloaded,
  missing: pl.models.missing,
  partial: pl.models.partial,
} as const;

function Step({ title, model }: { title: string; model: ModelView | undefined }) {
  const palette = usePalette();
  if (model === undefined) return null;
  const { entry, status, progress } = model;
  return (
    <View testID={`onboarding.step-${entry.id}`} style={[styles.step, { borderColor: palette.border }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
      <BodyText>
        {entry.displayName} · {formatSize(downloadSizeBytes(entry.id))}
      </BodyText>
      <BodyText testID={`onboarding.status-${entry.id}`}>
        {progress !== null ? pl.models.progress(progress) : status === null ? '' : STATUS_LABEL[status]}
      </BodyText>
    </View>
  );
}

// First-run wizard (MV-MOD-3): whisper, one voice and the default language model, then the topic list.
export function OnboardingScreen({ navigation }: RootScreenProps<'Onboarding'>) {
  const manager = useModelManager();
  const questions = useDownloadQuestions(manager);
  const voice = useSettingsStore((state) => state.ttsVoice);
  const update = useSettingsStore((state) => state.update);
  const needed = onboardingModels(voice);
  const views = needed.map((entry) => manager.models.find((model) => model.entry.id === entry.id));
  const missing = views.filter((model) => model !== undefined && model.status !== 'downloaded');
  const downloading = views.some((model) => model?.progress !== null && model?.progress !== undefined);
  const canSkip = missing.length > 0 && !downloading;
  const missingBytes = missing.reduce((total, model) => total + downloadSizeBytes(model?.entry.id ?? ''), 0);

  async function downloadAll() {
    for (const model of missing) {
      if (model === undefined) continue;
      const finished = await questions.download(model.entry);
      if (!finished) return;
    }
  }

  function finish() {
    update({ onboardingDone: true });
    navigation.reset({ index: 0, routes: [{ name: 'TopicList' }] });
  }

  return (
    <Screen testID="onboarding-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <BodyText>{pl.onboarding.intro}</BodyText>
        <Step title={STEP_TITLES[0] ?? ''} model={views[0]} />
        <Step title={STEP_TITLES[1] ?? ''} model={views[1]} />
        <View style={styles.voices}>
          {VOICES.map((option) => (
            <TextButton
              key={option}
              testID={`onboarding.voice-${option}`}
              label={ttsEntry(option).displayName}
              selected={voice === option}
              onPress={() => update({ ttsVoice: option })}
            />
          ))}
        </View>
        <Step title={STEP_TITLES[2] ?? ''} model={views[2]} />
        {manager.error !== null && <BodyText testID="onboarding.error">{manager.error.userMessage}</BodyText>}
        {canSkip && <BodyText>{pl.onboarding.skipHint}</BodyText>}
      </ScrollView>
      {/* The actions stay in view on small phones, below the scrolled steps. */}
      <View style={styles.footer}>
        {missing.length > 0 ? (
          <TextButton
            testID="onboarding.download-all"
            label={pl.onboarding.downloadAll(formatSize(missingBytes))}
            onPress={() => void downloadAll()}
          />
        ) : (
          <TextButton testID="onboarding.done" label={pl.onboarding.done} onPress={finish} />
        )}
        {canSkip && <TextButton testID="onboarding.skip" label={pl.onboarding.skip} onPress={finish} />}
      </View>
      {questions.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.md, paddingBottom: SPACING.lg },
  step: { borderWidth: 1, borderRadius: 8, padding: SPACING.md, gap: SPACING.xs },
  title: { fontSize: 17, fontWeight: '600' },
  voices: { flexDirection: 'row', gap: SPACING.sm },
  footer: { gap: SPACING.sm, paddingTop: SPACING.sm },
});
