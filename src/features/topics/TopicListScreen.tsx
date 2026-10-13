import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import type { Topic } from '../../db/repositories/TopicRepository';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';
import { SPACING, usePalette } from '../../theme/theme';
import { RenameTopicDialog } from './RenameTopicDialog';
import { TopicRow } from './TopicRow';
import { useTopics } from './useTopics';

export function TopicListScreen({ navigation }: RootScreenProps<'TopicList'>) {
  const palette = usePalette();
  const topics = useTopics();
  const [renaming, setRenaming] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState<Topic | null>(null);

  const openTopic = useCallback(
    (topic: Topic) => navigation.navigate('Conversation', { topicId: topic.id }),
    [navigation],
  );

  async function confirmDelete() {
    if (deleting === null) return;
    const topic = deleting;
    setDeleting(null);
    await topics.remove(topic.id);
  }

  async function createTopic() {
    openTopic(await topics.create());
  }

  async function saveRename(title: string) {
    if (renaming === null || title.trim().length === 0) return;
    await topics.rename(renaming.id, title);
    setRenaming(null);
  }

  const emptyText = topics.query.trim().length > 0 ? pl.topicList.noMatches : pl.topicList.empty;

  return (
    <Screen testID="topic-list-screen">
      <View style={styles.toolbar}>
        <TextButton testID="topic-list.new-topic" label={pl.topicList.newTopic} onPress={createTopic} />
        <TextButton
          testID="topic-list.open-settings"
          label={pl.topicList.openSettings}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>
      <TextInput
        testID="topic-list.search"
        accessibilityLabel={pl.topicList.searchPlaceholder}
        placeholder={pl.topicList.searchPlaceholder}
        placeholderTextColor={palette.textSecondary}
        value={topics.query}
        onChangeText={topics.setQuery}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.search, { color: palette.textPrimary, borderColor: palette.border }]}
      />
      <FlatList
        data={topics.topics}
        keyExtractor={(topic) => String(topic.id)}
        renderItem={({ item }) => (
          <TopicRow topic={item} onOpen={openTopic} onRename={setRenaming} onDelete={setDeleting} />
        )}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={topics.loaded ? <BodyText>{emptyText}</BodyText> : null}
      />
      {deleting !== null && (
        <ConfirmDialog
          testID="topic-list.delete-dialog"
          title={pl.topicList.deleteConfirmTitle}
          message={pl.topicList.deleteConfirmMessage(deleting.title)}
          confirmLabel={pl.topicList.delete}
          cancelLabel={pl.topicList.cancel}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}
      {renaming !== null && (
        <RenameTopicDialog
          key={renaming.id}
          initialTitle={renaming.title}
          onCancel={() => setRenaming(null)}
          onSave={saveRename}
        />
      )}
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: SPACING.sm },
  search: { borderWidth: 1, borderRadius: 8, padding: SPACING.sm, fontSize: 16 },
  separator: { height: SPACING.sm },
});
