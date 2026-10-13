import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { pl } from '../../../i18n/pl';
import { visibleHeaderTitle } from '../../../navigation/__tests__/support/header';
import type { RootStackParamList } from '../../../navigation/types';
import { ConversationScreen } from '../../conversation/ConversationScreen';
import { SettingsScreen } from '../../settings/SettingsScreen';
import { SummaryScreen } from '../../summary/SummaryScreen';
import { TopicListScreen } from '../TopicListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// The app opens the last active topic at start; these tests need the list itself in front.
async function renderList(db: SqlDatabase) {
  await render(
    <TestProviders db={db}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="TopicList">
          <Stack.Screen name="TopicList" component={TopicListScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="Summary" component={SummaryScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </TestProviders>,
  );
  await screen.findByTestId('topic-list-screen');
}

function titlesOnList(): string[] {
  return screen
    .getAllByTestId(/^topic-list\.topic-\d+$/)
    .map((row) => String(within(row).getAllByText(/.+/)[0]?.props.children));
}

describe('TopicListScreen', () => {
  let db: SqlDatabase;
  let topics: TopicRepository;
  let messages: MessageRepository;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    let now = 1_000;
    const clock = () => (now += 1_000);
    topics = new TopicRepository(db, clock);
    messages = new MessageRepository(db, clock);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.closeAsync();
  });

  // specky: crit 01M4TPSBAVP0JTTN6KFJ401ECW
  it('"Nowy temat" creates a topic and opens its conversation', async () => {
    await renderList(db);
    expect(await screen.findByText(pl.topicList.empty)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: pl.topicList.newTopic }));

    expect(await screen.findByTestId('conversation-screen')).toBeTruthy();
    await waitFor(() => expect(visibleHeaderTitle()).toBe(pl.topicList.defaultTitle));
    expect((await topics.listByLastActivity()).map((topic) => topic.title)).toEqual([
      pl.topicList.defaultTitle,
    ]);
  });

  // specky: crit 01M4TPSBHTWE0PKKEXKEDAYGTK
  it('puts the topic with the newest message at the top', async () => {
    const trip = await topics.create('Wakacje');
    await topics.create('Praca');
    await topics.create('Zakupy');
    await messages.add({ topicId: trip.id, role: 'user', content: 'Gdzie jechać?' });

    await renderList(db);

    expect(await screen.findByText('Wakacje')).toBeTruthy();
    expect(titlesOnList()).toEqual(['Wakacje', 'Zakupy', 'Praca']);
  });

  // specky: crit 01M4TPSBHTKV9C661RVDKGZJZP
  it('filters topics by a fragment of the title', async () => {
    await topics.create('Remont łazienki');
    await topics.create('Wakacje 2026');
    await topics.create('Łódź — mieszkanie');
    await renderList(db);
    await screen.findByText('Wakacje 2026');

    await fireEvent.changeText(screen.getByTestId('topic-list.search'), 'łó');
    await waitFor(() => expect(titlesOnList()).toEqual(['Łódź — mieszkanie']));

    await fireEvent.changeText(screen.getByTestId('topic-list.search'), 'xyz');
    expect(await screen.findByText(pl.topicList.noMatches)).toBeTruthy();
  });

  // specky: crit 01M4TPSBHTZD1GCPMPGTCWKPPG
  it('deletes a topic only after the user confirms', async () => {
    const doomed = await topics.create('Do usunięcia');
    await topics.create('Zostaje');
    await renderList(db);

    await fireEvent.press(
      await screen.findByRole('button', { name: pl.topicList.deleteLabel('Do usunięcia') }),
    );
    expect(await screen.findByTestId('topic-list.delete-dialog')).toHaveTextContent(/Do usunięcia/);
    expect(await topics.getById(doomed.id)).not.toBeNull();

    await fireEvent.press(screen.getByTestId('topic-list.delete-dialog.cancel'));
    expect(screen.queryByTestId('topic-list.delete-dialog')).toBeNull();
    expect(await topics.getById(doomed.id)).not.toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: pl.topicList.deleteLabel('Do usunięcia') }));
    await fireEvent.press(await screen.findByTestId('topic-list.delete-dialog.confirm'));
    await waitFor(() => expect(screen.queryByText('Do usunięcia')).toBeNull());
    expect(await topics.getById(doomed.id)).toBeNull();
    expect(titlesOnList()).toEqual(['Zostaje']);
  });

  // specky: crit 01M4TPSBHTQ3Y0DS0QSMZQJAXM
  it('a renamed topic shows the new name on the list and in its conversation', async () => {
    const topic = await topics.create('Robocza nazwa');
    await renderList(db);

    await fireEvent.press(
      await screen.findByRole('button', { name: pl.topicList.renameLabel('Robocza nazwa') }),
    );
    await fireEvent.changeText(await screen.findByTestId('topic-list.rename-input'), 'Budżet domowy');
    await fireEvent.press(screen.getByTestId('topic-list.rename-save'));

    expect(await screen.findByText('Budżet domowy')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`topic-list.topic-${topic.id}`));
    await screen.findByTestId('conversation-screen');
    await waitFor(() => expect(visibleHeaderTitle()).toBe('Budżet domowy'));
  });

  // specky: crit 01M4TPSBAVEH57XMG9P1Z3BJ8B
  it('choosing a topic opens its full history and the conversation can continue', async () => {
    const trip = await topics.create('Wakacje');
    await topics.create('Praca');
    await messages.add({ topicId: trip.id, role: 'user', content: 'Mam tydzień urlopu.' });
    await messages.add({ topicId: trip.id, role: 'assistant', content: 'Może Mazury?' });
    await renderList(db);

    await fireEvent.press(await screen.findByTestId(`topic-list.topic-${trip.id}`));

    expect(await screen.findByText('Mam tydzień urlopu.')).toBeTruthy();
    expect(screen.getByText('Może Mazury?')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('conversation.input'), 'A w górach?');
    await fireEvent.press(screen.getByTestId('conversation.send'));
    await waitFor(async () =>
      expect((await messages.listByTopic(trip.id)).map((message) => message.role)).toEqual([
        'user',
        'assistant',
        'user',
        'assistant',
      ]),
    );
    expect(await screen.findByText('A w górach?')).toBeTruthy();
  });

  it('keeps the old name when the new one is empty', async () => {
    await topics.create('Zostaje');
    await renderList(db);

    await fireEvent.press(await screen.findByRole('button', { name: pl.topicList.renameLabel('Zostaje') }));
    await fireEvent.changeText(await screen.findByTestId('topic-list.rename-input'), '   ');
    await fireEvent.press(screen.getByTestId('topic-list.rename-save'));

    expect((await topics.listByLastActivity())[0]?.title).toBe('Zostaje');
  });
});
