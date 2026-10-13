import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { createTestFactories, EngineRegistry } from '../../../engines/EngineRegistry';
import { FakeLlmEngine } from '../../../engines/fakes/FakeLlmEngine';
import type { RootStackParamList } from '../../../navigation/types';
import { DEFAULT_SYSTEM_PROMPT, resolveSystemPrompt } from '../../../services/prompts';
import { useSettingsStore } from '../../../state/settings';
import { ModelsScreen } from '../../models/ModelsScreen';
import { SettingsScreen } from '../../settings/SettingsScreen';
import { SummaryScreen } from '../../summary/SummaryScreen';
import { ConversationScreen } from '../ConversationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

describe('system prompt', () => {
  let db: SqlDatabase;
  let topicId: number;
  let llm: FakeLlmEngine;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topicId = (await new TopicRepository(db).create('Kuchnia')).id;
    llm = new FakeLlmEngine(() => 'Dobrze.');
    useSettingsStore.getState().reset();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function renderScreen(initial: keyof RootStackParamList) {
    await render(
      <TestProviders
        db={db}
        engines={new EngineRegistry('test', { ...createTestFactories(), llm: () => llm })}
      >
        <NavigationContainer>
          <Stack.Navigator initialRouteName={initial}>
            <Stack.Screen name="Conversation" component={ConversationScreen} initialParams={{ topicId }} />
            <Stack.Screen name="Summary" component={SummaryScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Models" component={ModelsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
  }

  async function sendMessage(text: string) {
    await fireEvent.changeText(await screen.findByTestId('conversation.input'), text);
    await fireEvent.press(screen.getByTestId('conversation.send'));
    await waitFor(() => expect(screen.getByTestId('conversation.send')).toBeTruthy());
  }

  async function setTopicPrompt(prompt: string) {
    await fireEvent.press(await screen.findByTestId('conversation.open-topic-prompt'));
    await fireEvent.changeText(await screen.findByTestId('conversation.topic-prompt.input'), prompt);
    await fireEvent.press(screen.getByTestId('conversation.topic-prompt.save'));
    await fireEvent.press(screen.getByTestId('conversation.topic-prompt.close'));
  }

  it('uses the Polish default asking for short answers to be read aloud', async () => {
    await renderScreen('Conversation');
    await sendMessage('Co na obiad?');

    expect(llm.requests[0]?.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/po polsku/);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/zwięźle/);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/czytana na głos/);
  });

  // specky: crit 01M4TPSBY57E67QRW2PBZ737AJ
  it('a topic with its own prompt uses it instead of the global one', async () => {
    useSettingsStore.getState().update({ globalSystemPrompt: 'Globalny: mów krótko.' });
    await renderScreen('Conversation');

    await setTopicPrompt('Jesteś szefem kuchni.');
    await sendMessage('Co na obiad?');

    expect(llm.requests[0]?.systemPrompt).toBe('Jesteś szefem kuchni.');
    expect((await new TopicRepository(db).getById(topicId))?.systemPrompt).toBe('Jesteś szefem kuchni.');
  });

  // specky: crit 01M4TPSBY58VX983CNTS28VG7P
  it('an empty topic prompt means the global prompt is used', async () => {
    useSettingsStore.getState().update({ globalSystemPrompt: 'Globalny: mów krótko.' });
    await new TopicRepository(db).setSystemPrompt(topicId, 'Jesteś szefem kuchni.');
    await renderScreen('Conversation');

    await setTopicPrompt('   ');
    await sendMessage('Co na obiad?');

    expect(llm.requests[0]?.systemPrompt).toBe('Globalny: mów krótko.');
    expect((await new TopicRepository(db).getById(topicId))?.systemPrompt).toBeNull();
  });

  it('edits the global prompt in settings and can restore the default', async () => {
    await renderScreen('Settings');
    expect((await screen.findByTestId('settings.system-prompt.input')).props.value).toBe(
      DEFAULT_SYSTEM_PROMPT,
    );

    await fireEvent.changeText(screen.getByTestId('settings.system-prompt.input'), 'Odpowiadaj jak pirat.');
    await fireEvent.press(screen.getByTestId('settings.system-prompt.save'));
    expect(useSettingsStore.getState().globalSystemPrompt).toBe('Odpowiadaj jak pirat.');

    await fireEvent.press(screen.getByTestId('settings.system-prompt.restore'));
    expect(useSettingsStore.getState().globalSystemPrompt).toBeNull();
    await waitFor(() =>
      expect(screen.getByTestId('settings.system-prompt.input').props.value).toBe(DEFAULT_SYSTEM_PROMPT),
    );
  });

  it.each([
    ['topic', 'global', 'topic'],
    ['', 'global', 'global'],
    [null, '  ', DEFAULT_SYSTEM_PROMPT],
    [null, null, DEFAULT_SYSTEM_PROMPT],
  ])('resolves topic %p / global %p to %p', (topic, global, expected) => {
    expect(resolveSystemPrompt(topic, global)).toBe(expected);
  });
});
