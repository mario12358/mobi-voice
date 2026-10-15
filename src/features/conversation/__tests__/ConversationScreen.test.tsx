import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { FakeAudioPorts } from '../../../audio/fakeAudioPorts';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { createTestFactories, EngineRegistry } from '../../../engines/EngineRegistry';
import type { LlmEngine, LlmRequest, LlmResult } from '../../../engines/types';
import { pl } from '../../../i18n/pl';
import { MemoryModelFileSystem } from '../../../models/download/__tests__/support/memoryModelFileSystem';
import type { ConnectionType } from '../../../models/download/types';
import type { RootStackParamList } from '../../../navigation/types';
import { SummaryScreen } from '../../summary/SummaryScreen';
import { ConversationScreen } from '../ConversationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// LLM driven step by step from the test: each `next()` emits one token, `finish()` ends the answer.
class SteppedLlm implements LlmEngine {
  readonly requests: LlmRequest[] = [];
  private release: (() => void) | null = null;

  generate(request: LlmRequest, onToken: (token: string) => void, signal: AbortSignal): Promise<LlmResult> {
    this.requests.push(request);
    const tokens = ['Proponuję ', 'Mazury. ', 'Są ', 'piękne.'];
    let text = '';
    return new Promise((resolve) => {
      const step = () => {
        const token = tokens.shift();
        if (signal.aborted || token === undefined) {
          resolve({ text, aborted: signal.aborted });
          return;
        }
        text += token;
        onToken(token);
        this.release = step;
      };
      signal.addEventListener('abort', () => resolve({ text, aborted: true }));
      this.release = step;
    });
  }

  next(): void {
    this.release?.();
  }
}

function registryWith(llm: LlmEngine, mode: 'test' | 'production' = 'test'): EngineRegistry {
  return new EngineRegistry(mode, { ...createTestFactories(), llm: () => llm });
}

async function renderConversation(
  db: SqlDatabase,
  topicId: number,
  engines: EngineRegistry,
  connection: ConnectionType = 'wifi',
  fileSystem = new MemoryModelFileSystem(new Map()),
  audio = new FakeAudioPorts(),
) {
  await render(
    <TestProviders
      db={db}
      engines={engines}
      ports={{ fileSystem, network: { connection: async () => connection }, audio }}
    >
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Conversation" component={ConversationScreen} initialParams={{ topicId }} />
          <Stack.Screen name="Summary" component={SummaryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </TestProviders>,
  );
  await screen.findByTestId('conversation-screen');
}

describe('ConversationScreen', () => {
  let db: SqlDatabase;
  let topicId: number;
  let messages: MessageRepository;
  let llm: SteppedLlm;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topicId = (await new TopicRepository(db).create('Wakacje')).id;
    messages = new MessageRepository(db);
    llm = new SteppedLlm();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.closeAsync();
  });

  async function finishAnswer() {
    for (let step = 0; step < 5; step += 1) llm.next();
    await screen.findByTestId('conversation.send');
  }

  async function type(text: string) {
    await fireEvent.changeText(await screen.findByTestId('conversation.input'), text);
    await fireEvent.press(screen.getByTestId('conversation.send'));
  }

  // specky: crit 01M4TPSBVHVSTT9FRBA7G3CJCD
  it('sends a typed message to the model together with the topic history', async () => {
    await messages.add({ topicId, role: 'user', content: 'Mam tydzień urlopu w lipcu.' });
    await messages.add({ topicId, role: 'assistant', content: 'Świetnie, gdzie chcesz jechać?' });
    await renderConversation(db, topicId, registryWith(llm));

    await type('Nad jezioro.');

    await waitFor(() => expect(llm.requests).toHaveLength(1));
    expect(llm.requests[0]?.messages).toEqual([
      { role: 'user', content: 'Mam tydzień urlopu w lipcu.' },
      { role: 'assistant', content: 'Świetnie, gdzie chcesz jechać?' },
      { role: 'user', content: 'Nad jezioro.' },
    ]);
    expect(screen.getByTestId('conversation.input').props.value).toBe('');
    await finishAnswer();
  });

  // specky: crit 01M4TPSBQDHM1ENPJ1BSBYH39A
  it('shows the answer in the chat bubble while it is being generated', async () => {
    await renderConversation(db, topicId, registryWith(llm));
    await type('Gdzie jechać?');
    await waitFor(() => expect(llm.requests).toHaveLength(1));

    // The question is in the chat right away, before the first word of the answer.
    expect(screen.getByText('Gdzie jechać?')).toBeTruthy();
    expect(screen.getByTestId('conversation.streaming')).toHaveTextContent(pl.conversation.preparingAnswer);
    llm.next();
    await waitFor(() => expect(screen.getByTestId('conversation.streaming')).toHaveTextContent('Proponuję'));
    llm.next();
    await waitFor(() =>
      expect(screen.getByTestId('conversation.streaming')).toHaveTextContent('Proponuję Mazury.'),
    );
    expect(screen.getByTestId('conversation.stop')).toBeTruthy();

    llm.next();
    llm.next();
    llm.next();
    await waitFor(() => expect(screen.queryByTestId('conversation.streaming')).toBeNull());
    expect(screen.getByText('Proponuję Mazury. Są piękne.')).toBeTruthy();
    expect(screen.getAllByText('Gdzie jechać?')).toHaveLength(1);
    expect(screen.getByTestId('conversation.send')).toBeTruthy();
  });

  // specky: crit 01M4TPSCFBD729TD4DGRJNHKRW
  it('explains a denied microphone, links to the system settings and keeps typing available', async () => {
    const audio = new FakeAudioPorts('denied');
    await renderConversation(db, topicId, registryWith(llm), 'wifi', undefined, audio);

    expect(await screen.findByText(pl.conversation.micDenied)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('conversation.open-system-settings'));
    expect(audio.settingsOpened).toBe(1);
    expect(screen.getByTestId('conversation.input')).toBeTruthy();
    expect(screen.getByTestId('conversation.send')).toBeTruthy();
  });

  it('shows no microphone notice while the permission is granted or not yet asked', async () => {
    await renderConversation(
      db,
      topicId,
      registryWith(llm),
      'wifi',
      undefined,
      new FakeAudioPorts('undetermined'),
    );
    await screen.findByTestId('conversation.input');

    expect(screen.queryByTestId('conversation.mic-denied')).toBeNull();
  });

  // specky: crit 01M4TPSBVH4RAMAQ7GSXN6R8NK
  it('chats by text without the microphone permission', async () => {
    await renderConversation(db, topicId, registryWith(llm), 'wifi', undefined, new FakeAudioPorts('denied'));
    await screen.findByTestId('conversation.mic-denied');

    await type('Nad jezioro.');
    await waitFor(() => expect(llm.requests).toHaveLength(1));
    await finishAnswer();

    expect(screen.getByText('Proponuję Mazury. Są piękne.')).toBeTruthy();
  });

  // specky: crit 01M4TPSD05YJQ92GQ33KMKKNKM
  it("talks to the topic's own model when one is chosen, to the global model otherwise", async () => {
    await renderConversation(db, topicId, registryWith(llm));
    expect(screen.getByTestId('conversation.open-topic-model')).toHaveTextContent(
      pl.conversation.topicModel('Qwen 2.5 1.5B'),
    );

    await type('Pierwsze pytanie');
    await waitFor(() => expect(llm.requests).toHaveLength(1));
    await finishAnswer();
    expect(llm.requests[0]?.model).toBe('qwen2.5-1.5b');

    await fireEvent.press(screen.getByTestId('conversation.open-topic-model'));
    await fireEvent.press(await screen.findByTestId('conversation.topic-model.llama3.2-1b'));
    await waitFor(() =>
      expect(screen.getByTestId('conversation.open-topic-model')).toHaveTextContent(
        pl.conversation.topicModel('Llama 3.2 1B'),
      ),
    );

    await type('Drugie pytanie');
    await waitFor(() => expect(llm.requests).toHaveLength(2));
    await finishAnswer();
    expect(llm.requests[1]?.model).toBe('llama3.2-1b');
    expect(llm.requests[1]?.messages[0]).toEqual({ role: 'user', content: 'Pierwsze pytanie' });
    expect((await new TopicRepository(db).getById(topicId))?.modelOverride).toBe('llama3.2-1b');
  });

  it('STOP ends the answer, which stays in the chat marked as interrupted', async () => {
    await renderConversation(db, topicId, registryWith(llm));
    await type('Gdzie jechać?');
    await waitFor(() => expect(llm.requests).toHaveLength(1));
    llm.next();
    await waitFor(() => expect(screen.getByTestId('conversation.streaming')).toHaveTextContent('Proponuję'));

    await fireEvent.press(screen.getByTestId('conversation.stop'));

    const answer = await screen.findByText('Proponuję');
    expect(within(answer.parent?.parent ?? answer).getByText(pl.conversation.interrupted)).toBeTruthy();
    expect((await messages.listByTopic(topicId)).at(-1)).toMatchObject({
      content: 'Proponuję',
      interrupted: true,
    });
  });

  it('offers to download the model when it is not on the device, asking before using cellular data', async () => {
    const fileSystem = new MemoryModelFileSystem(new Map());
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((button) => button.text === pl.conversation.cellularConfirm)?.onPress?.();
    });
    await renderConversation(db, topicId, registryWith(llm, 'production'), 'cellular', fileSystem);

    expect(await screen.findByTestId('conversation.model-missing')).toBeTruthy();
    expect(screen.queryByTestId('conversation.input')).toBeNull();

    await fireEvent.press(screen.getByTestId('conversation.download-model'));

    await waitFor(() => expect(fileSystem.requests).toHaveLength(1));
    expect(Alert.alert).toHaveBeenCalledWith(
      pl.conversation.cellularTitle,
      expect.any(String),
      expect.any(Array),
    );
    expect(fileSystem.requests[0]?.url).toMatch(/qwen2\.5-1\.5b-instruct-q4_k_m\.gguf$/);
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się pobrać modelu');
  });

  it('shows the model error and keeps the question when generation fails', async () => {
    const failing: LlmEngine = { generate: async () => Promise.reject(new Error('boom')) };
    await renderConversation(db, topicId, registryWith(failing));

    await type('Halo?');

    expect(await screen.findByRole('alert')).toHaveTextContent('Dostawca modelu zwrócił błąd');
    expect(screen.getByText('Halo?')).toBeTruthy();
  });
});
