import { Modal, StyleSheet, Text, View } from 'react-native';

import { SPACING, usePalette } from '../theme/theme';
import { BodyText } from './BodyText';
import { TextButton } from './TextButton';

interface Props {
  testID: string;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// In-app confirmation instead of the native Alert: same look on both platforms and reachable by testID in e2e.
export function ConfirmDialog({
  testID,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: Props) {
  const palette = usePalette();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View testID={testID} style={[styles.card, { backgroundColor: palette.surface }]}>
          <Text accessibilityRole="header" style={[styles.title, { color: palette.textPrimary }]}>
            {title}
          </Text>
          <BodyText>{message}</BodyText>
          <View style={styles.actions}>
            <TextButton testID={`${testID}.cancel`} label={cancelLabel} onPress={onCancel} />
            <TextButton testID={`${testID}.confirm`} label={confirmLabel} onPress={onConfirm} />
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
});
