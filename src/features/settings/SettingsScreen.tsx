import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { PromptEditor } from '../../components/PromptEditor';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';
import { ttsEntry } from '../../models/catalog';
import { DEFAULT_SYSTEM_PROMPT } from '../../services/prompts';
import { useSettingsStore, type TtsVoice } from '../../state/settings';
import { SPACING, usePalette } from '../../theme/theme';

// The default is stored as null so that a future better default reaches everyone who kept it.
function toStoredPrompt(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === DEFAULT_SYSTEM_PROMPT ? null : trimmed;
}

const VOICES: TtsVoice[] = ['gosia', 'darkman'];

function VoicePicker() {
  const palette = usePalette();
  const voice = useSettingsStore((state) => state.ttsVoice);
  const update = useSettingsStore((state) => state.update);
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
        {pl.settings.voiceTitle}
      </Text>
      <View style={styles.choices}>
        {VOICES.map((option) => (
          <TextButton
            key={option}
            testID={`settings.voice-${option}`}
            label={ttsEntry(option).displayName}
            selected={voice === option}
            onPress={() => update({ ttsVoice: option })}
          />
        ))}
      </View>
      <BodyText>{pl.settings.voiceHint}</BodyText>
    </View>
  );
}

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const globalPrompt = useSettingsStore((state) => state.globalSystemPrompt);
  const update = useSettingsStore((state) => state.update);
  const shownPrompt = globalPrompt ?? DEFAULT_SYSTEM_PROMPT;

  return (
    <Screen testID="settings-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <TextButton
          testID="settings.open-models"
          label={pl.settings.openModels}
          onPress={() => navigation.navigate('Models')}
        />
        <VoicePicker />
        <PromptEditor
          key={shownPrompt}
          testID="settings.system-prompt"
          title={pl.settings.systemPromptTitle}
          hint={pl.settings.systemPromptHint}
          initialValue={shownPrompt}
          onSave={(value) => update({ globalSystemPrompt: toStoredPrompt(value) })}
          onRestoreDefault={() => update({ globalSystemPrompt: null })}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.lg },
  section: { gap: SPACING.sm },
  heading: { fontSize: 17, fontWeight: '600' },
  choices: { flexDirection: 'row', gap: SPACING.sm },
});
