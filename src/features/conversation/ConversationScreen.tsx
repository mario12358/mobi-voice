import { useHeaderHeight } from '@react-navigation/elements';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import type { Message } from '../../db/repositories/MessageRepository';
import { pl } from '../../i18n/pl';
import { downloadSizeBytes } from '../../models/catalog';
import type { RootScreenProps } from '../../navigation/types';
import { E2EVoiceControls } from '../../e2e/E2EVoiceControls';
import { useLatencyStore, type LatencySample } from '../../state/latency';
import { useSettingsStore } from '../../state/settings';
import { SPACING, usePalette } from '../../theme/theme';
import { MessageBubble } from './MessageBubble';
import { TopicPromptDialog } from './TopicPromptDialog';
import { useConversation } from './useConversation';
import { useMicPermission } from './useMicPermission';
import { useVoiceSession, type VoiceSessionView } from './useVoiceSession';
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

function seconds(milliseconds: number | null): string {
  if (milliseconds === null) return pl.conversation.latencyMissing;
  return `${(Math.round(milliseconds / 100) / 10).toFixed(1).replace('.', ',')} s`;
}

// Diagnostic mode: timings of the last voice exchange (MV-VOICE-8).
function LatencyLine({ sample }: { sample: LatencySample }) {
  return (
    <BodyText testID="conversation.latency">
      {pl.conversation.latency(
        seconds(sample.sttMs),
        seconds(sample.firstTokenMs),
        seconds(sample.firstAudioMs),
      )}
    </BodyText>
  );
}

// Voice mode: one big button starts/ends the session; the state and the last utterance stay visible.
function VoicePanel({ voice }: { voice: VoiceSessionView }) {
  const palette = usePalette();
  const mode = useSettingsStore((state) => state.conversationMode);
  const update = useSettingsStore((state) => state.update);
  const diagnostics = useSettingsStore((state) => state.diagnosticsEnabled);
  const lastLatency = useLatencyStore((state) => state.samples.at(-1));
  const active = voice.state !== 'idle';
  return (
    <View testID="conversation.voice" style={styles.voice}>
      <View style={styles.voiceRow}>
        <Text
          testID="conversation.voice-state"
          accessibilityLiveRegion="polite"
          style={[styles.voiceState, { color: palette.textPrimary }]}
        >
          {pl.conversation.voiceState[voice.state]}
        </Text>
        <TextButton
          testID="conversation.mode-toggle"
          label={mode === 'continuous' ? pl.conversation.modeContinuous : pl.conversation.modeInterrupted}
          onPress={() => update({ conversationMode: mode === 'continuous' ? 'interrupted' : 'continuous' })}
        />
      </View>
      {diagnostics && lastLatency !== undefined && <LatencyLine sample={lastLatency} />}
      {voice.transcript !== null && (
        <BodyText testID="conversation.transcript">{pl.conversation.youSaid(voice.transcript)}</BodyText>
      )}
      <Pressable
        testID="conversation.mic"
        accessibilityRole="button"
        accessibilityLabel={active ? pl.conversation.voiceStop : pl.conversation.voiceStart}
        accessibilityState={{ selected: active }}
        onPress={() => void voice.toggle()}
        style={({ pressed }) => [
          styles.mic,
          { backgroundColor: active ? palette.accent : palette.surface, borderColor: palette.accent },
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.micLabel, { color: active ? palette.background : palette.accent }]}>
          {active ? pl.conversation.voiceStop : pl.conversation.voiceStart}
        </Text>
      </Pressable>
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
  const voice = useVoiceSession(topicId, conversation.reload);
  const [draft, setDraft] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  const generating = conversation.streaming !== null;
  const streaming = conversation.streaming ?? voice.streaming;
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

  const error = conversation.error ?? voice.error ?? readiness.error;

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
        {/* e2e builds only; at the top, where small CI emulator screens still show it whole. */}
        <E2EVoiceControls />
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
          ListEmptyComponent={streaming !== null ? null : <BodyText>{pl.conversation.emptyHistory}</BodyText>}
          ListFooterComponent={
            streaming !== null ? (
              <MessageBubble
                testID="conversation.streaming"
                role="assistant"
                content={streaming}
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
        {(microphone.status === 'denied' || voice.micDenied) && (
          <MicDenied onOpenSettings={microphone.openSystemSettings} />
        )}
        {readiness.ready === false ? (
          <ModelMissing readiness={readiness} />
        ) : (
          <>
            <VoicePanel voice={voice} />
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
          </>
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
  voice: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  voiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  voiceState: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  mic: { borderWidth: 2, borderRadius: 32, paddingVertical: SPACING.md, alignItems: 'center' },
  micLabel: { fontSize: 18, fontWeight: '700' },
});
