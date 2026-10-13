import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { DatabaseProvider } from '../../db/DatabaseProvider';
import { prepareDatabase } from '../../db/migrate';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { pl } from '../../i18n/pl';
import { RootNavigator } from '../RootNavigator';

interface JsonNode {
  type: string;
  props: Record<string, unknown>;
  children: (JsonNode | string)[] | null;
}

// Native-stack titles are props of the native header config, not <Text>; read the visible screen's one.
function visibleHeaderTitle(): unknown {
  const screens: JsonNode[] = [];
  const walk = (node: JsonNode | string) => {
    if (typeof node === 'string') return;
    if (node.type === 'RNSScreen' && node.props['aria-hidden'] !== true) screens.push(node);
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as JsonNode | JsonNode[] | null;
  (Array.isArray(tree) ? tree : tree === null ? [] : [tree]).forEach(walk);
  const header = screens
    .at(-1)
    ?.children?.find(
      (child): child is JsonNode => typeof child !== 'string' && child.type === 'RNSScreenStackHeaderConfig',
    );
  return header?.props.title;
}

async function renderNavigator(db: SqlDatabase) {
  await render(
    <DatabaseProvider open={async () => db}>
      <RootNavigator />
    </DatabaseProvider>,
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
    expect(screen.getByText(pl.topicList.empty)).toBeTruthy();
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

    fireEvent.press(await screen.findByRole('button', { name: pl.topicList.openSettings }));
    expect(await screen.findByTestId('settings-screen')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: pl.settings.openModels }));
    expect(await screen.findByTestId('models-screen')).toBeTruthy();
    expect(screen.getByText(pl.models.placeholder)).toBeTruthy();
  });

  it('opens the summary of the current topic from the conversation', async () => {
    const topic = await new TopicRepository(db).create('Zakupy');
    await renderNavigator(db);

    fireEvent.press(await screen.findByRole('button', { name: pl.conversation.openSummary }));

    expect(await screen.findByTestId('summary-screen')).toBeTruthy();
    expect(topic.id).toBeGreaterThan(0);
  });
});
