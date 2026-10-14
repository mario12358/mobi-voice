import { useHeaderHeight } from '@react-navigation/elements';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import type { Message } from '../../db/repositories/MessageRepository';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes } from '../../models/catalog';
import type { RootScreenProps } from '../../navigation/types';
import { SPACING, usePalette } from '../../theme/theme';
import { MessageBubble } from './MessageBubble';
import { TopicPromptDialog } from './TopicPromptDialog';
import { useConversation } from './useConversation';
import { useMicPermission } from './useMicPermission';
import { formatSize, useModelReadiness, type ModelReadiness } from './useModelReadiness';

function ModelMissing({ readiness }: { readiness: ModelReadiness }) {
  const { model, progress } = readiness;
  return (
    <View testID="conversation.model-missing" style={styles.notice}>
      <BodyText>{pl.conversation.modelMissing(model.displayName)}</BodyText>
      {progress === null ? (
        <TextButton
          testID="conversation.download-model"
          label={pl.conversation.downloadModel(model.displayName, formatSize(downloadSizeBytes(model.id)))}
          onPress={() => void readiness.download()}
        />
      ) : (
        <BodyText testID="conversation.download-progress">{pl.conversation.downloading(progress)}</BodyText>
      )}
    </View>
  );
}

// Voice needs the microphone; typing keeps working without it (MV-VOICE-7, MV-CHAT-3).
function MicDenied({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View testID="conversation.mic-denied" style={styles.notice}>
      <BodyText>{pl.conversation.micDenied}</BodyText>
      <TextButton
        testID="conversation.open-system-settings"
        label={pl.conversation.openSystemSettings}
        onPress={onOpenSettings}
      />
    </View>
  );
}

export function ConversationScreen({ navigation, route }: RootScreenProps<'Conversation'>) {
  const { topicId } = route.params;
  const palette = usePalette();
  const headerHeight = useHeaderHeight();
  const conversation = useConversation(topicId);
  const readiness = useModelReadiness(conversation.topic);
  const microphone = useMicPermission();
  const [draft, setDraft] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  const generating = conversation.streaming !== null;
  const title = conversation.topic?.title;

  useEffect(() => {
    if (title !== undefined) navigation.setOptions({ title });
  }, [navigation, title]);

  async function submit() {
    const text = draft;
    if (text.trim().length === 0) return;
    setDraft('');
    await conversation.send(text);
  }

  const error = conversation.error ?? readiness.error;

  return (
    <Screen testID="conversation-screen">
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // The screen starts below the navigation header, whose height depends on the device (notch, island).
        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.toolbar}>
          <TextButton
            label={pl.conversation.openSummary}
            onPress={() => navigation.navigate('Summary', { topicId })}
          />
          <TextButton
            testID="conversation.open-topic-prompt"
            label={pl.promptEditor.openTopicPrompt}
            onPress={() => setEditingPrompt(true)}
          />
        </View>
        <FlatList
          ref={list}
          style={styles.fill}
          contentContainerStyle={styles.messages}
          data={conversation.messages}
          keyExtractor={(message) => String(message.id)}
          // A tap on a row button must act even while the keyboard (search/message field) is open.
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <MessageBubble
              testID={`conversation.message-${item.id}`}
              role={item.role}
              content={item.content}
              interrupted={item.interrupted}
            />
          )}
          ListEmptyComponent={generating ? null : <BodyText>{pl.conversation.emptyHistory}</BodyText>}
          ListFooterComponent={
            generating ? (
              <MessageBubble
                testID="conversation.streaming"
                role="assistant"
                content={conversation.streaming ?? ''}
                interrupted={false}
              />
            ) : null
          }
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        />
        {error !== null && (
          <Text accessibilityRole="alert" style={[styles.error, { color: palette.accent }]}>
            {error.userMessage}
          </Text>
        )}
        {microphone.status === 'denied' && <MicDenied onOpenSettings={microphone.openSystemSettings} />}
        {readiness.ready === false ? (
          <ModelMissing readiness={readiness} />
        ) : (
          <View style={styles.composer}>
            <TextInput
              testID="conversation.input"
              accessibilityLabel={pl.conversation.inputPlaceholder}
              placeholder={pl.conversation.inputPlaceholder}
              placeholderTextColor={palette.textSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
              autoCapitalize="sentences"
              style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
            />
            {generating ? (
              <TextButton
                testID="conversation.stop"
                label={pl.conversation.stop}
                onPress={conversation.stop}
              />
            ) : (
              <TextButton
                testID="conversation.send"
                label={pl.conversation.send}
                onPress={() => void submit()}
              />
            )}
          </View>
        )}
      </KeyboardAvoidingView>
      {editingPrompt && (
        <TopicPromptDialog
          prompt={conversation.topic?.systemPrompt ?? null}
          onSave={(prompt) => void conversation.setTopicPrompt(prompt)}
          onClose={() => setEditingPrompt(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  toolbar: { flexDirection: 'row', gap: SPACING.sm },
  messages: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  notice: { gap: SPACING.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: SPACING.sm, fontSize: 16, maxHeight: 120 },
  error: { fontSize: 14 },
});
