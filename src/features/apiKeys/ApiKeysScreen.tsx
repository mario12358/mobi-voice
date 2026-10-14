import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { PROVIDER_NAMES } from '../../cloud/createCloudEngines';
import { pl } from '../../i18n/pl';
import { SPACING, usePalette } from '../../theme/theme';
import { useApiKeys, type ProviderView } from './useApiKeys';

function ProviderCard({
  view,
  onSave,
  onRemove,
}: {
  view: ProviderView;
  onSave: (key: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const palette = usePalette();
  const [draft, setDraft] = useState('');
  const { provider } = view;

  async function save() {
    if (await onSave(draft)) setDraft('');
  }

  return (
    <View testID={`api-keys.${provider}`} style={[styles.card, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[styles.name, { color: palette.textPrimary }]}>
        {PROVIDER_NAMES[provider]}
      </Text>
      <BodyText testID={`api-keys.${provider}.status`}>
        {view.configured ? pl.apiKeys.configured : pl.apiKeys.missing}
      </BodyText>
      <TextInput
        testID={`api-keys.${provider}.input`}
        accessibilityLabel={pl.apiKeys.inputLabel(PROVIDER_NAMES[provider])}
        placeholder={view.configured ? pl.apiKeys.replacePlaceholder : pl.apiKeys.inputPlaceholder}
        placeholderTextColor={palette.textSecondary}
        value={draft}
        onChangeText={setDraft}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
      />
      {view.error !== null && (
        <Text
          testID={`api-keys.${provider}.error`}
          accessibilityRole="alert"
          style={{ color: palette.accent }}
        >
          {view.error.userMessage}
        </Text>
      )}
      <View style={styles.actions}>
        {view.saving ? (
          <BodyText>{pl.apiKeys.checking}</BodyText>
        ) : (
          <TextButton
            testID={`api-keys.${provider}.save`}
            label={pl.apiKeys.save}
            onPress={() => void save()}
          />
        )}
        {view.configured && (
          <TextButton testID={`api-keys.${provider}.remove`} label={pl.apiKeys.remove} onPress={onRemove} />
        )}
      </View>
      {view.models.length > 0 && (
        <BodyText testID={`api-keys.${provider}.models`}>
          {pl.apiKeys.models(view.models.join(', '))}
        </BodyText>
      )}
    </View>
  );
}

// MV-CLOUD-1: the user's own keys to OpenAI, Anthropic, Google Gemini and Meta Llama.
export function ApiKeysScreen() {
  const keys = useApiKeys();
  return (
    <Screen testID="api-keys-screen">
      <ScrollView
        testID="api-keys.scroll"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <BodyText>{pl.apiKeys.intro}</BodyText>
        {keys.providers.map((view) => (
          <ProviderCard
            key={view.provider}
            view={view}
            onSave={(key) => keys.save(view.provider, key)}
            onRemove={() => void keys.remove(view.provider)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.md, paddingBottom: SPACING.lg },
  card: { borderWidth: 1, borderRadius: 8, padding: SPACING.md, gap: SPACING.sm },
  name: { fontSize: 17, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: SPACING.sm, fontSize: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
});
