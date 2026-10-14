import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { PromptEditor } from '../../components/PromptEditor';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';
import { useEngines } from '../../engines/EngineProvider';
import { DEFAULT_LOCAL_MODEL_ID } from '../../engines/llm/createLocalLlmEngine';
import { llmEntries, ttsEntry } from '../../models/catalog';
import { DEFAULT_SYSTEM_PROMPT } from '../../services/prompts';
import {
  SILENCE_THRESHOLD_MAX_MS,
  SILENCE_THRESHOLD_MIN_MS,
  useSettingsStore,
  type ConversationMode,
  type TtsVoice,
  type WhisperVariant,
} from '../../state/settings';
import { SPACING, usePalette } from '../../theme/theme';

// The default is stored as null so that a future better default reaches everyone who kept it.
function toStoredPrompt(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === DEFAULT_SYSTEM_PROMPT ? null : trimmed;
}

const SILENCE_STEP_MS = 500;

interface ChoiceProps<Value extends string> {
  testID: string;
  title: string;
  hint?: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange(value: Value): void;
}

// One-of-many setting: a row of buttons, the chosen one filled.
function Choice<Value extends string>({ testID, title, hint, value, options, onChange }: ChoiceProps<Value>) {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
        {title}
      </Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <TextButton
            key={option.value}
            testID={`${testID}-${option.value}`}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
      {hint !== undefined && <BodyText>{hint}</BodyText>}
    </View>
  );
}

const VOICE_OPTIONS = (['gosia', 'darkman'] as TtsVoice[]).map((voice) => ({
  value: voice,
  label: ttsEntry(voice).displayName,
}));
const MODE_OPTIONS: { value: ConversationMode; label: string }[] = [
  { value: 'continuous', label: pl.settings.modeContinuous },
  { value: 'interrupted', label: pl.settings.modeInterrupted },
];
const WHISPER_OPTIONS: { value: WhisperVariant; label: string }[] = [
  { value: 'small', label: pl.settings.whisperSmall },
  { value: 'base', label: pl.settings.whisperBase },
];
const MODEL_OPTIONS = llmEntries().map((entry) => ({ value: entry.id, label: entry.displayName }));

function seconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(1).replace('.', ',');
}

function SilenceThreshold() {
  const palette = usePalette();
  const threshold = useSettingsStore((state) => state.silenceThresholdMs);
  const update = useSettingsStore((state) => state.update);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
        {pl.settings.silenceTitle}
      </Text>
      <View style={styles.stepper}>
        <TextButton
          testID="settings.silence-less"
          label={pl.settings.silenceLess}
          onPress={() =>
            update({ silenceThresholdMs: Math.max(SILENCE_THRESHOLD_MIN_MS, threshold - SILENCE_STEP_MS) })
          }
        />
        <Text testID="settings.silence-value" style={[styles.heading, { color: palette.textPrimary }]}>
          {pl.settings.silenceValue(seconds(threshold))}
        </Text>
        <TextButton
          testID="settings.silence-more"
          label={pl.settings.silenceMore}
          onPress={() =>
            update({ silenceThresholdMs: Math.min(SILENCE_THRESHOLD_MAX_MS, threshold + SILENCE_STEP_MS) })
          }
        />
      </View>
      <BodyText>{pl.settings.silenceHint}</BodyText>
    </View>
  );
}

function Privacy() {
  const palette = usePalette();
  return (
    <View testID="settings.privacy" style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
        {pl.settings.privacyTitle}
      </Text>
      <BodyText>{pl.settings.privacyText}</BodyText>
    </View>
  );
}

function DiagnosticsSwitch() {
  const palette = usePalette();
  const enabled = useSettingsStore((state) => state.diagnosticsEnabled);
  const update = useSettingsStore((state) => state.update);
  return (
    <View style={styles.section}>
      <View style={styles.switchRow}>
        <Text style={[styles.heading, { color: palette.textPrimary }]}>{pl.settings.diagnostics}</Text>
        <Switch
          testID="settings.diagnostics"
          accessibilityLabel={pl.settings.diagnostics}
          value={enabled}
          onValueChange={(value) => update({ diagnosticsEnabled: value })}
        />
      </View>
      <BodyText>{pl.settings.diagnosticsHint}</BodyText>
    </View>
  );
}

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const globalPrompt = useSettingsStore((state) => state.globalSystemPrompt);
  const defaultModelId = useSettingsStore((state) => state.defaultModelId);
  const voice = useSettingsStore((state) => state.ttsVoice);
  const mode = useSettingsStore((state) => state.conversationMode);
  const whisper = useSettingsStore((state) => state.whisperVariant);
  const update = useSettingsStore((state) => state.update);
  const engines = useEngines();
  const shownPrompt = globalPrompt ?? DEFAULT_SYSTEM_PROMPT;

  return (
    <Screen testID="settings-screen">
      <ScrollView testID="settings.scroll" contentContainerStyle={styles.content}>
        <TextButton
          testID="settings.open-models"
          label={pl.settings.openModels}
          onPress={() => navigation.navigate('Models')}
        />
        <Choice
          testID="settings.model"
          title={pl.settings.defaultModelTitle}
          hint={pl.settings.defaultModelHint}
          value={defaultModelId ?? DEFAULT_LOCAL_MODEL_ID}
          options={MODEL_OPTIONS}
          onChange={(value) => update({ defaultModelId: value })}
        />
        <Choice
          testID="settings.voice"
          title={pl.settings.voiceTitle}
          hint={pl.settings.voiceHint}
          value={voice}
          options={VOICE_OPTIONS}
          onChange={(value) => update({ ttsVoice: value })}
        />
        <Choice
          testID="settings.mode"
          title={pl.settings.modeTitle}
          hint={pl.settings.modeHint}
          value={mode}
          options={MODE_OPTIONS}
          onChange={(value) => update({ conversationMode: value })}
        />
        <SilenceThreshold />
        <Choice
          testID="settings.whisper"
          title={pl.settings.whisperTitle}
          value={whisper}
          options={WHISPER_OPTIONS}
          onChange={(value) => update({ whisperVariant: value })}
        />
        <PromptEditor
          key={shownPrompt}
          testID="settings.system-prompt"
          title={pl.settings.systemPromptTitle}
          hint={pl.settings.systemPromptHint}
          initialValue={shownPrompt}
          onSave={(value) => update({ globalSystemPrompt: toStoredPrompt(value) })}
          onRestoreDefault={() => update({ globalSystemPrompt: null })}
        />
        <DiagnosticsSwitch />
        <Privacy />
        <TextButton
          testID="settings.open-licenses"
          label={pl.settings.openLicenses}
          onPress={() => navigation.navigate('Licenses')}
        />
        {/* e2e builds only: their fake engines skip the first-run wizard at start, so Detox opens it here. */}
        {engines.mode === 'test' && (
          <TextButton
            testID="e2e.open-onboarding"
            label={pl.common.e2eOnboarding}
            onPress={() => navigation.navigate('Onboarding')}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  section: { gap: SPACING.sm },
  heading: { fontSize: 17, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
