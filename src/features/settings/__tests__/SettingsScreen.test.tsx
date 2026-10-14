import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import type { RootStackParamList } from '../../../navigation/types';
import { useSettingsStore } from '../../../state/settings';
import { SettingsScreen } from '../SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

describe('SettingsScreen', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    useSettingsStore.getState().reset();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function renderSettings() {
    await render(
      <TestProviders db={db}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId('settings-screen');
  }

  // specky: crit 01M4TPSCC9NRMPW7N35Z8GZXV7
  it('lets the user pick one of the two Piper voices', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings.voice-gosia')).toBeSelected();
    expect(screen.getByTestId('settings.voice-darkman')).not.toBeSelected();

    await fireEvent.press(screen.getByText('Darkman'));

    expect(useSettingsStore.getState().ttsVoice).toBe('darkman');
    expect(screen.getByTestId('settings.voice-darkman')).toBeSelected();
    expect(screen.getByTestId('settings.voice-gosia')).not.toBeSelected();
  });

  it('turns the diagnostic mode on and off', async () => {
    await renderSettings();

    await fireEvent(screen.getByTestId('settings.diagnostics'), 'valueChange', true);
    expect(useSettingsStore.getState().diagnosticsEnabled).toBe(true);

    await fireEvent(screen.getByTestId('settings.diagnostics'), 'valueChange', false);
    expect(useSettingsStore.getState().diagnosticsEnabled).toBe(false);
  });
});
