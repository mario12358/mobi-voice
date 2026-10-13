import { ScrollView, StyleSheet } from 'react-native';

import { PromptEditor } from '../../components/PromptEditor';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';
import { DEFAULT_SYSTEM_PROMPT } from '../../services/prompts';
import { useSettingsStore } from '../../state/settings';
import { SPACING } from '../../theme/theme';

// The default is stored as null so that a future better default reaches everyone who kept it.
function toStoredPrompt(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === DEFAULT_SYSTEM_PROMPT ? null : trimmed;
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
});
