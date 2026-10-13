import { Modal, StyleSheet, View } from 'react-native';

import { PromptEditor } from '../../components/PromptEditor';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import { SPACING, usePalette } from '../../theme/theme';

interface Props {
  prompt: string | null;
  onSave: (prompt: string) => void;
  onClose: () => void;
}

export function TopicPromptDialog({ prompt, onSave, onClose }: Props) {
  const palette = usePalette();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <PromptEditor
            key={prompt ?? ''}
            testID="conversation.topic-prompt"
            title={pl.promptEditor.topicTitle}
            hint={pl.promptEditor.topicHint}
            initialValue={prompt ?? ''}
            onSave={onSave}
          />
          <TextButton
            testID="conversation.topic-prompt.close"
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
  card: { borderRadius: 12, padding: SPACING.md, gap: SPACING.md },
});
