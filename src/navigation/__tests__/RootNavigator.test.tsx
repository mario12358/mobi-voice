import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { pl } from '../../i18n/pl';
import { RootNavigator } from '../RootNavigator';
import { visibleHeaderTitle } from './support/header';

async function renderNavigator(db: SqlDatabase) {
  await render(
    <TestProviders db={db}>
      <RootNavigator />
    </TestProviders>,
  );
}

describe('RootNavigator', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('opens the topic list when there are no topics yet', async () => {
    await renderNavigator(db);

    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
    expect(await screen.findByText(pl.topicList.empty)).toBeTruthy();
  });

  // specky: crit 01M4TPSBAVNP2W68X6ATSBXC2C
  it('opens the most recently active topic at startup', async () => {
    let now = 1_000;
    const clock = () => (now += 1_000);
    const topics = new TopicRepository(db, clock);
    const trip = await topics.create('Wakacje');
    await topics.create('Praca');
    await new MessageRepository(db, clock).add({ topicId: trip.id, role: 'user', content: 'Gdzie jechać?' });

    await renderNavigator(db);

    expect(await screen.findByTestId('conversation-screen')).toBeTruthy();
    await waitFor(() => expect(visibleHeaderTitle()).toBe('Wakacje'));
  });

  it('goes from the topic list to settings and on to models', async () => {
    await renderNavigator(db);

    await fireEvent.press(await screen.findByRole('button', { name: pl.topicList.openSettings }));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: pl.settings.openModels }));
    expect(await screen.findByTestId('models-screen')).toBeTruthy();
    expect(screen.getByText(pl.models.sectionLlm)).toBeTruthy();
  });

  it('goes from the settings to the licenses', async () => {
    await renderNavigator(db);

    await fireEvent.press(await screen.findByRole('button', { name: pl.topicList.openSettings }));
    await fireEvent.press(await screen.findByTestId('settings.open-licenses'));

    expect(await screen.findByTestId('licenses-screen')).toBeTruthy();
  });

  it('opens the summary of the current topic from the conversation', async () => {
    const topic = await new TopicRepository(db).create('Zakupy');
    await renderNavigator(db);

    await fireEvent.press(await screen.findByRole('button', { name: pl.conversation.openSummary }));

    expect(await screen.findByTestId('summary-screen')).toBeTruthy();
    expect(topic.id).toBeGreaterThan(0);
  });
});
