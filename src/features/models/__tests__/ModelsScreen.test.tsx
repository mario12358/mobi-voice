import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { pl } from '../../../i18n/pl';
import type { ConnectionType } from '../../../models/download/types';
import type { RootStackParamList } from '../../../navigation/types';
import { useSettingsStore } from '../../../state/settings';
import { ModelsScreen } from '../ModelsScreen';
import { CatalogFileSystem } from './support/catalogFileSystem';

const Stack = createNativeStackNavigator<RootStackParamList>();
const GB = 1_000_000_000;

describe('ModelsScreen', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    useSettingsStore.getState().reset();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function renderModels(
    fileSystem = new CatalogFileSystem(),
    { memory = 8 * GB, connection = 'wifi' as ConnectionType } = {},
  ) {
    await render(
      <TestProviders
        db={db}
        ports={{ fileSystem, network: { connection: async () => connection }, memoryBytes: () => memory }}
      >
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Models" component={ModelsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId('models.status-qwen2.5-1.5b');
    return fileSystem;
  }

  function row(id: string) {
    return within(screen.getByTestId(`models.row-${id}`));
  }

  it('lists language models, whisper variants and both voices with their size and state', async () => {
    await renderModels();

    for (const id of [
      'qwen2.5-1.5b',
      'llama3.2-3b',
      'whisper-small',
      'whisper-base',
      'piper-pl_PL-gosia-medium',
    ]) {
      expect(row(id).getByText(pl.models.missing)).toBeTruthy();
    }
    expect(row('whisper-small').getByText(pl.models.size('0,5 GB'))).toBeTruthy();
    expect(screen.queryByTestId('models.row-espeak-ng-data-pl')).toBeNull();
  });

  // specky: crit 01M4TPSCQVTNAKJ3XXG6PS1DZF
  it('downloads a local model to the device and deletes it after confirmation', async () => {
    const fileSystem = await renderModels();

    await fireEvent.press(screen.getByTestId('models.download-qwen2.5-1.5b'));
    await waitFor(() => expect(row('qwen2.5-1.5b').getByText(pl.models.downloaded)).toBeTruthy());
    expect(fileSystem.sizes.get('/docs/models/qwen2.5-1.5b/model.gguf')).toBeGreaterThan(1 * GB);

    await fireEvent.press(screen.getByTestId('models.delete-qwen2.5-1.5b'));
    await fireEvent.press(await screen.findByTestId('models.delete-dialog.confirm'));

    await waitFor(() => expect(row('qwen2.5-1.5b').getByText(pl.models.missing)).toBeTruthy());
    expect(fileSystem.sizes.get('/docs/models/qwen2.5-1.5b/model.gguf')).toBeUndefined();
  });

  it('shows the progress, can cancel and later resume a download', async () => {
    const fileSystem = await renderModels(new CatalogFileSystem(true));

    await fireEvent.press(screen.getByTestId('models.download-whisper-base'));
    expect(await screen.findByTestId('models.progress-whisper-base')).toHaveTextContent(
      /Pobieranie… (49|50)%/,
    );
    await fireEvent.press(screen.getByTestId('models.cancel-whisper-base'));

    await waitFor(() => expect(row('whisper-base').getByText(pl.models.partial)).toBeTruthy());
    expect(row('whisper-base').getByText(pl.models.resume)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('models.download-whisper-base'));
    await waitFor(() => expect(fileSystem.requests).toHaveLength(2));
    fileSystem.release();
    await waitFor(() => expect(row('whisper-base').getByText(pl.models.downloaded)).toBeTruthy());
  });

  // specky: crit 01M4TPSCXRQYNMQH707Z7NFVT5
  it('marks models that need more RAM than the phone has', async () => {
    await renderModels(new CatalogFileSystem(), { memory: 3.7 * GB });

    expect(screen.getByTestId('models.not-recommended-llama3.2-3b')).toBeTruthy();
    expect(screen.getByTestId('models.not-recommended-qwen2.5-3b')).toBeTruthy();
    expect(screen.queryByTestId('models.not-recommended-qwen2.5-1.5b')).toBeNull();
    expect(screen.queryByTestId('models.not-recommended-whisper-small')).toBeNull();
  });

  // specky: crit 01M4TPSCXRZQ1S7977M866Q4DY
  it('downloads a not-recommended model only after the user confirms', async () => {
    const fileSystem = await renderModels(new CatalogFileSystem(), { memory: 3.7 * GB });

    await fireEvent.press(screen.getByTestId('models.download-llama3.2-3b'));
    expect(await screen.findByText(pl.models.notRecommendedTitle)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('models.confirm-download.cancel'));
    expect(fileSystem.requests).toHaveLength(0);

    await fireEvent.press(screen.getByTestId('models.download-llama3.2-3b'));
    await fireEvent.press(await screen.findByTestId('models.confirm-download.confirm'));

    await waitFor(() => expect(row('llama3.2-3b').getByText(pl.models.downloaded)).toBeTruthy());
  });

  it('asks before using cellular data while "Wi-Fi only" is on, and not after it is turned off', async () => {
    const fileSystem = await renderModels(new CatalogFileSystem(), { connection: 'cellular' });

    await fireEvent.press(screen.getByTestId('models.download-whisper-base'));
    expect(await screen.findByText(pl.models.cellularTitle)).toBeTruthy();
    expect(fileSystem.requests).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('models.confirm-download.confirm'));
    await waitFor(() => expect(row('whisper-base').getByText(pl.models.downloaded)).toBeTruthy());

    await fireEvent(screen.getByTestId('models.wifi-only'), 'valueChange', false);
    expect(useSettingsStore.getState().wifiOnlyDownloads).toBe(false);
    await fireEvent.press(screen.getByTestId('models.download-whisper-small'));
    await waitFor(() => expect(row('whisper-small').getByText(pl.models.downloaded)).toBeTruthy());
    expect(screen.queryByText(pl.models.cellularTitle)).toBeNull();
  });
});
