import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Topic } from '../../db/repositories/TopicRepository';
import { pl } from '../../i18n/pl';
import { SPACING, usePalette } from '../../theme/theme';

interface Props {
  topic: Topic;
  onOpen: (topic: Topic) => void;
  onRename: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });

function TopicRowComponent({ topic, onOpen, onRename, onDelete }: Props) {
  const palette = usePalette();
  return (
    <View style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Pressable
        accessibilityRole="button"
        testID={`topic-list.topic-${topic.id}`}
        onPress={() => onOpen(topic)}
        style={styles.main}
      >
        <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={1}>
          {topic.title}
        </Text>
        <Text style={[styles.meta, { color: palette.textSecondary }]}>
          {pl.topicList.lastActivity(DATE_FORMAT.format(new Date(topic.lastActivityAt)))}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pl.topicList.renameLabel(topic.title)}
        onPress={() => onRename(topic)}
        style={styles.action}
      >
        <Text style={{ color: palette.accent }}>{pl.topicList.rename}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pl.topicList.deleteLabel(topic.title)}
        onPress={() => onDelete(topic)}
        style={styles.action}
      >
        <Text style={{ color: palette.accent }}>{pl.topicList.delete}</Text>
      </Pressable>
    </View>
  );
}

export const TopicRow = memo(TopicRowComponent);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  main: { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12 },
  action: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.md },
});
