import { useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';

import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import { SPACING, usePalette } from '../../theme/theme';

interface Props {
  initialTitle: string;
  onCancel: () => void;
  onSave: (title: string) => void;
}

// Mount with a `key` per topic so the field always starts from that topic's current name.
export function RenameTopicDialog({ initialTitle, onCancel, onSave }: Props) {
  const palette = usePalette();
  const [title, setTitle] = useState(initialTitle);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.textPrimary }]}>
            {pl.topicList.renameDialogTitle}
          </Text>
          <TextInput
            testID="topic-list.rename-input"
            value={title}
            onChangeText={setTitle}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={() => onSave(title)}
            style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
          />
          <View style={styles.actions}>
            <TextButton label={pl.topicList.cancel} onPress={onCancel} />
            <TextButton
              testID="topic-list.rename-save"
              label={pl.topicList.save}
              onPress={() => onSave(title)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: SPACING.lg, backgroundColor: '#00000080' },
  card: { borderRadius: 12, padding: SPACING.md, gap: SPACING.md },
  title: { fontSize: 18, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: SPACING.sm, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
});
