import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import { MessageRepository } from '../../../db/repositories/MessageRepository';
import { SummaryTemplateRepository } from '../../../db/repositories/SummaryTemplateRepository';
import { TopicRepository } from '../../../db/repositories/TopicRepository';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { createTestFactories, EngineRegistry } from '../../../engines/EngineRegistry';
import { E2E_SCRIPT, E2E_SUMMARY_PREFIX, FakeLlmEngine } from '../../../engines/fakes/FakeLlmEngine';
import { FakeTtsEngine } from '../../../engines/fakes/FakeTtsEngine';
import { pl } from '../../../i18n/pl';
import type { RootStackParamList } from '../../../navigation/types';
import { MemoryShareSheet } from '../../../share/memoryShareSheet';
import { SummaryScreen } from '../SummaryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

describe('SummaryScreen', () => {
  let db: SqlDatabase;
  let topicId: number;
  let llm: FakeLlmEngine;
  let tts: FakeTtsEngine;
  let share: MemoryShareSheet;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    topicId = (await new TopicRepository(db).create('Wyjazd na Mazury')).id;
    const messages = new MessageRepository(db);
    await messages.add({ topicId, role: 'user', content: 'Gdzie nocować w Giżycku?' });
    await messages.add({ topicId, role: 'assistant', content: 'Polecam kemping nad jeziorem.' });
    llm = new FakeLlmEngine(E2E_SCRIPT);
    tts = new FakeTtsEngine();
    share = new MemoryShareSheet();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // `ready`: what the screen shows once loaded — no summary yet, or the kept one.
  async function renderSummary(ready = 'summary.empty') {
    const engines = new EngineRegistry('test', { ...createTestFactories(), llm: () => llm, tts: () => tts });
    await render(
      <TestProviders db={db} engines={engines} ports={{ share }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Summary" component={SummaryScreen} initialParams={{ topicId }} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId(ready);
  }

  async function templateId(name: string): Promise<number> {
    const templates = await new SummaryTemplateRepository(db).list();
    return templates.find((template) => template.name === name)!.id;
  }

  it('summarizes in the chosen form and shows the summary again after coming back', async () => {
    await renderSummary();
    const tasks = await templateId('Lista zadań');

    await fireEvent.press(screen.getByTestId(`summary.template-${tasks}`));
    await fireEvent.press(screen.getByTestId('summary.generate'));

    const content = await screen.findByTestId('summary.content');
    expect(content).toHaveTextContent(new RegExp(`^${E2E_SUMMARY_PREFIX}`));
    const instruction = (await new SummaryTemplateRepository(db).getById(tasks))!.instruction;
    expect(llm.requests.at(-1)!.messages[0]!.content.startsWith(instruction)).toBe(true);
    expect(llm.requests.at(-1)!.messages[0]!.content).toContain('Polecam kemping nad jeziorem.');
    expect(screen.getByTestId('summary.generate')).toHaveTextContent(pl.summary.regenerate);

    // Leaving and opening the screen again: the summary is kept with the topic, in its form.
    await screen.unmount();
    await renderSummary('summary.content');
    expect(screen.getByTestId('summary.content')).toHaveTextContent(new RegExp(`^${E2E_SUMMARY_PREFIX}`));
    expect(screen.getByTestId(`summary.template-${tasks}`)).toBeSelected();
  });

  it('summarizes with an own instruction and keeps it as a template', async () => {
    await renderSummary();

    await fireEvent.press(screen.getByTestId('summary.template-custom'));
    await fireEvent.changeText(screen.getByTestId('summary.custom-instruction'), 'Dwa zdania dla rodziny.');
    await fireEvent.press(screen.getByTestId('summary.generate'));

    expect(await screen.findByTestId('summary.content')).toHaveTextContent(
      /Forma: Dwa zdania dla rodziny\. Wiadomości: 2\.$/,
    );

    await fireEvent.changeText(screen.getByTestId('summary.template-name'), 'Dla rodziny');
    await fireEvent.press(screen.getByTestId('summary.save-template'));

    const saved = await templateId('Dla rodziny');
    expect(await screen.findByTestId(`summary.template-${saved}`)).toBeSelected();
  });

  it('makes a new summary on regenerate', async () => {
    await renderSummary();
    await fireEvent.press(screen.getByTestId('summary.generate'));
    await screen.findByTestId('summary.content');

    await fireEvent.press(screen.getByTestId(`summary.template-${await templateId('E-mail')}`));
    await fireEvent.press(screen.getByTestId('summary.generate'));

    await waitFor(() => expect(screen.getByTestId('summary.content')).toHaveTextContent(/Forma: .*e-mail/i));
    const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM summaries WHERE topic_id = ?', [
      topicId,
    ]);
    expect(rows).toHaveLength(2);
  });

  // specky: crit 01M4TPSDBQC02027MG5MRTHCP4
  it('copies, shares as Markdown and reads the summary aloud', async () => {
    await renderSummary();
    await fireEvent.press(screen.getByTestId('summary.generate'));
    const content = (await screen.findByTestId('summary.content')).props.children as string;

    await fireEvent.press(screen.getByTestId('summary.copy'));
    expect(share.copied).toEqual([content]);
    expect(await screen.findByTestId('summary.copied')).toHaveTextContent(pl.summary.copied);

    await fireEvent.press(screen.getByTestId('summary.share'));
    await waitFor(() =>
      expect(share.shared).toEqual([
        { title: 'Wyjazd na Mazury', text: `# Wyjazd na Mazury\n\n${content}\n` },
      ]),
    );

    await fireEvent.press(screen.getByTestId('summary.listen'));
    await waitFor(() => expect(tts.spoken).toEqual([content]));
  });

  it('stops the generation on request and keeps nothing', async () => {
    llm = new FakeLlmEngine(E2E_SCRIPT, 50);
    await renderSummary();

    await fireEvent.press(screen.getByTestId('summary.generate'));
    await fireEvent.press(await screen.findByTestId('summary.cancel'));

    expect(await screen.findByTestId('summary.generate')).toHaveTextContent(pl.summary.generate);
    expect(screen.getByTestId('summary.empty')).toBeOnTheScreen();
    expect(await db.getAllAsync('SELECT id FROM summaries')).toEqual([]);
  });
});
