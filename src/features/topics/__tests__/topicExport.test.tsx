import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { pl } from '../../../i18n/pl';
import type { RootStackParamList } from '../../../navigation/types';
import { MemoryShareSheet } from '../../../share/memoryShareSheet';
import { ConversationScreen } from '../../conversation/ConversationScreen';
import { SummaryScreen } from '../../summary/SummaryScreen';
import { TopicListScreen } from '../TopicListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

describe('topic export', () => {
  let db: SqlDatabase;
  let topicId: number;
  let share: MemoryShareSheet;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topicId = (await new TopicRepository(db).create('Remont kuchni')).id;
    await new MessageRepository(db).add({ topicId, role: 'user', content: 'Jakie płytki do kuchni?' });
    share = new MemoryShareSheet();
    await render(
      <TestProviders db={db} ports={{ share }}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="TopicList">
            <Stack.Screen name="TopicList" component={TopicListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="Summary" component={SummaryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId(`topic-list.topic-${topicId}`);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('shares the topic history as Markdown from the topic list', async () => {
    await fireEvent.press(screen.getByRole('button', { name: pl.topicExport.actionLabel('Remont kuchni') }));

    await waitFor(() => expect(share.shared).toHaveLength(1));
    expect(share.shared[0]!.title).toBe('Remont kuchni');
    expect(share.shared[0]!.text).toMatch(/^# Remont kuchni\n/);
    expect(share.shared[0]!.text).toContain('Jakie płytki do kuchni?');
  });

  it('shares the same export from the conversation', async () => {
    await fireEvent.press(screen.getByTestId(`topic-list.topic-${topicId}`));
    await fireEvent.press(await screen.findByTestId('conversation.export'));

    await waitFor(() => expect(share.shared).toHaveLength(1));
    expect(share.shared[0]!.text).toMatch(/^# Remont kuchni\n[\s\S]*Jakie płytki do kuchni\?/);
  });
});
