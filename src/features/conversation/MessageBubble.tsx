import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MessageRole } from '../../db/repositories/MessageRepository';
import { pl } from '../../i18n/pl';
import { SPACING, usePalette } from '../../theme/theme';

interface Props {
  role: MessageRole;
  content: string;
  interrupted: boolean;
  testID?: string;
}

function MessageBubbleComponent({ role, content, interrupted, testID }: Props) {
  const palette = usePalette();
  const mine = role === 'user';
  return (
    <View
      testID={testID}
      accessibilityLabel={mine ? pl.conversation.you : pl.conversation.assistant}
      style={[
        styles.bubble,
        mine ? styles.mine : styles.theirs,
        { backgroundColor: mine ? palette.accent : palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={{ color: mine ? palette.background : palette.textPrimary }}>{content}</Text>
      {interrupted && (
        <Text style={[styles.badge, { color: palette.textSecondary }]}>{pl.conversation.interrupted}</Text>
      )}
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', borderRadius: 14, borderWidth: 1, padding: SPACING.sm, gap: SPACING.xs },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  badge: { fontSize: 11, fontStyle: 'italic' },
});
