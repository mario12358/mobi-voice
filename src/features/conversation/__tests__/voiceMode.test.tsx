import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { FakeAudioPorts } from '../../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { encodeWav, synthesize } from '../../../engines/__tests__/support/audio';
import { createTestFactories, EngineRegistry } from '../../../engines/EngineRegistry';
import { FakeSttEngine } from '../../../engines/fakes/FakeSttEngine';
import { FakeTtsEngine } from '../../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../../engines/fakes/WavAudioSource';
import type { LlmEngine, LlmRequest, LlmResult } from '../../../engines/types';
import { pl } from '../../../i18n/pl';
import type { RootStackParamList } from '../../../navigation/types';
import { useLatencyStore } from '../../../state/latency';
import { useSettingsStore } from '../../../state/settings';
import { ConversationScreen } from '../ConversationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Answer released by the test, so the screen can be checked while the model is still working.
class GatedLlm implements LlmEngine {
  private release: (() => void) | null = null;

  generate(_request: LlmRequest, onToken: (token: string) => void): Promise<LlmResult> {
    return new Promise((resolve) => {
      this.release = () => {
        onToken('Proponuję Mazury.');
        resolve({ text: 'Proponuję Mazury.', aborted: false });
      };
    });
  }

  get waiting(): boolean {
    return this.release !== null;
  }

  answer(): void {
    this.release?.();
    this.release = null;
  }
}

describe('ConversationScreen voice mode', () => {
  let db: SqlDatabase;
  let topicId: number;
  let llm: GatedLlm;
  let source: WavAudioSource;
  let stt: FakeSttEngine;
  let tts: FakeTtsEngine;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topicId = (await new TopicRepository(db).create('Wakacje')).id;
    useSettingsStore.getState().reset();
    useSettingsStore.getState().update({ silenceThresholdMs: 1_500 });
    llm = new GatedLlm();
    source = new WavAudioSource();
    stt = new FakeSttEngine(['Gdzie jechać?']);
    tts = new FakeTtsEngine(60_000);
  });

  afterEach(async () => {
    await tts.stop();
    await db.closeAsync();
  });

  async function renderConversation(audio = new FakeAudioPorts()) {
    const engines = new EngineRegistry('test', {
      ...createTestFactories(),
      llm: () => llm,
      stt: () => stt,
      tts: () => tts,
      audioSource: () => source,
    });
    await render(
      <TestProviders db={db} engines={engines} ports={{ audio }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Conversation" component={ConversationScreen} initialParams={{ topicId }} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId('conversation.mic');
  }

  function stateLabel() {
    return screen.getByTestId('conversation.voice-state');
  }

  // specky: crit 01M4TPSC85FNP5ZTJ00E05C140
  it('shows the voice session state as it listens, processes, speaks and listens again', async () => {
    await renderConversation();
    expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.idle);

    await fireEvent.press(screen.getByTestId('conversation.mic'));
    await waitFor(() => expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.listening));

    source.enqueueWav(encodeWav(synthesize([{ tone: 500 }, { silence: 1_600 }])));
    await waitFor(() => expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.processing));
    expect(await screen.findByText(pl.conversation.youSaid('Gdzie jechać?'))).toBeTruthy();

    await waitFor(() => expect(llm.waiting).toBe(true));
    llm.answer();
    await waitFor(() => expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.speaking));
    expect(await screen.findByText('Proponuję Mazury.')).toBeTruthy();

    await tts.stop();
    await waitFor(() => expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.listening));

    await fireEvent.press(screen.getByTestId('conversation.mic'));
    await waitFor(() => expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.idle));
    expect(source.isRunning).toBe(false);
  });

  // specky: crit 01M4TPSC85Q9KY04JF3KEEC2XM
  it('switches the conversation mode globally with one tap', async () => {
    await renderConversation();
    const toggle = screen.getByTestId('conversation.mode-toggle');
    expect(toggle).toHaveTextContent(pl.conversation.modeContinuous);

    await fireEvent.press(toggle);

    expect(useSettingsStore.getState().conversationMode).toBe('interrupted');
    expect(screen.getByTestId('conversation.mode-toggle')).toHaveTextContent(pl.conversation.modeInterrupted);

    await fireEvent.press(screen.getByTestId('conversation.mode-toggle'));
    expect(useSettingsStore.getState().conversationMode).toBe('continuous');
  });

  // specky: crit 01M4TPSCJV5Y6488ZMZ28DRVZT
  it('shows STT, first token and first audio times of the last exchange in diagnostic mode', async () => {
    useLatencyStore.getState().clear();
    useLatencyStore.getState().record({ at: 1, sttMs: 2_000, firstTokenMs: 3_000, firstAudioMs: 4_000 });
    useLatencyStore.getState().record({ at: 2, sttMs: 850, firstTokenMs: 1_240, firstAudioMs: null });
    await renderConversation();
    expect(screen.queryByTestId('conversation.latency')).toBeNull();

    useSettingsStore.getState().update({ diagnosticsEnabled: true });

    expect(await screen.findByTestId('conversation.latency')).toHaveTextContent(
      pl.conversation.latency('0,9 s', '1,2 s', pl.conversation.latencyMissing),
    );
  });

  it('explains a denied microphone when voice is started and keeps typing', async () => {
    await renderConversation(new FakeAudioPorts('undetermined', 'denied'));

    await fireEvent.press(screen.getByTestId('conversation.mic'));

    expect(await screen.findByText(pl.conversation.micDenied)).toBeTruthy();
    expect(stateLabel()).toHaveTextContent(pl.conversation.voiceState.idle);
    expect(screen.getByTestId('conversation.input')).toBeTruthy();
  });
});
