import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { TextButton } from '../../components/TextButton';
import { PROVIDER_NAMES } from '../../cloud/createCloudEngines';
import { pl } from '../../i18n/pl';
import { useCloudModels } from '../apiKeys/useCloudModels';
import { llmEntries } from '../../models/catalog';
import { SPACING, usePalette } from '../../theme/theme';

interface Props {
  // The topic's own model, or null when it follows the settings.
  override: string | null;
  defaultModelName: string;
  onChoose: (modelId: string | null) => void;
  onClose: () => void;
}

// MV-MOD-5: a topic can use its own language model; the history stays.
export function TopicModelDialog({ override, defaultModelName, onChoose, onClose }: Props) {
  const palette = usePalette();
  const cloudModels = useCloudModels();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View testID="conversation.topic-model" style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.textPrimary }]}>
            {pl.conversation.topicModelTitle}
          </Text>
          <BodyText>{pl.conversation.topicModelHint}</BodyText>
          <ScrollView testID="conversation.topic-model.scroll" contentContainerStyle={styles.options}>
            <TextButton
              testID="conversation.topic-model.default"
              label={pl.conversation.topicModelDefault(defaultModelName)}
              selected={override === null}
              onPress={() => onChoose(null)}
            />
            {llmEntries().map((entry) => (
              <TextButton
                key={entry.id}
                testID={`conversation.topic-model.${entry.id}`}
                label={entry.displayName}
                selected={override === entry.id}
                onPress={() => onChoose(entry.id)}
              />
            ))}
            {cloudModels.map((model) => (
              <TextButton
                key={model.id}
                testID={`conversation.topic-model.${model.id}`}
                label={`${PROVIDER_NAMES[model.provider]}: ${model.model}`}
                selected={override === model.id}
                onPress={() => onChoose(model.id)}
              />
            ))}
          </ScrollView>
          <TextButton
            testID="conversation.topic-model.close"
            label={pl.promptEditor.close}
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: SPACING.lg, backgroundColor: '#00000080' },
  card: { borderRadius: 12, padding: SPACING.md, gap: SPACING.md, maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: '600' },
  options: { gap: SPACING.sm },
});
