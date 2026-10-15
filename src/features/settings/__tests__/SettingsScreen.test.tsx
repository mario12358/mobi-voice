import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { pl } from '../../../i18n/pl';
import type { RootStackParamList } from '../../../navigation/types';
import { MODEL_CATALOG } from '../../../models/catalog';
import { SETTINGS_STORAGE_KEY, useSettingsStore } from '../../../state/settings';
import { LicensesScreen } from '../LicensesScreen';
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
            <Stack.Screen name="Licenses" component={LicensesScreen} />
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

  it('asks before sending crash reports: off by default, switched on and off in Privacy', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings.crash-reports')).toHaveProp('value', false);
    expect(screen.getByText(pl.settings.crashReportsHint)).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('settings.crash-reports'), 'valueChange', true);
    expect(useSettingsStore.getState().crashReportsConsent).toBe(true);
    await waitFor(async () => expect((await stored()).crashReportsConsent).toBe(true));

    await fireEvent(screen.getByTestId('settings.crash-reports'), 'valueChange', false);
    expect(useSettingsStore.getState().crashReportsConsent).toBe(false);
  });

  async function stored(): Promise<Record<string, unknown>> {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw === null ? {} : (JSON.parse(raw) as { state: Record<string, unknown> }).state;
  }

  it('changes and saves the default model, conversation mode and whisper variant', async () => {
    await renderSettings();
    expect(screen.getByTestId('settings.model-qwen2.5-1.5b')).toBeSelected();

    await fireEvent.press(screen.getByTestId('settings.model-gemma2-2b'));
    await fireEvent.press(screen.getByTestId('settings.mode-interrupted'));
    await fireEvent.press(screen.getByTestId('settings.whisper-base'));

    expect(screen.getByTestId('settings.model-gemma2-2b')).toBeSelected();
    expect(screen.getByTestId('settings.mode-interrupted')).toBeSelected();
    expect(screen.getByTestId('settings.whisper-base')).toBeSelected();
    expect(await stored()).toMatchObject({
      defaultModelId: 'gemma2-2b',
      conversationMode: 'interrupted',
      whisperVariant: 'base',
    });
  });

  it('sets the silence threshold in half-second steps within 1.5–6 s', async () => {
    await renderSettings();
    expect(screen.getByTestId('settings.silence-value')).toHaveTextContent('3,0 s');

    await fireEvent.press(screen.getByTestId('settings.silence-more'));
    expect(screen.getByTestId('settings.silence-value')).toHaveTextContent('3,5 s');
    expect((await stored()).silenceThresholdMs).toBe(3_500);

    for (let step = 0; step < 10; step += 1)
      await fireEvent.press(screen.getByTestId('settings.silence-more'));
    expect(screen.getByTestId('settings.silence-value')).toHaveTextContent('6,0 s');

    for (let step = 0; step < 12; step += 1)
      await fireEvent.press(screen.getByTestId('settings.silence-less'));
    expect(screen.getByTestId('settings.silence-value')).toHaveTextContent('1,5 s');
    expect((await stored()).silenceThresholdMs).toBe(1_500);
  });

  // specky: crit 01M4TPSDJ62M6TE9A5F0JVH4E3
  it('tells where the conversation content goes', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings.privacy')).toHaveTextContent(pl.settings.privacyText, {
      exact: false,
    });
  });

  // specky: crit 01M4TPSDPP4W0NEMR8EHA2PQQP
  it('opens the licenses of every catalog model from the settings', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings.open-licenses'));

    expect(await screen.findByTestId('licenses-screen')).toBeTruthy();
    for (const entry of MODEL_CATALOG) {
      expect(screen.getByText(entry.displayName)).toBeTruthy();
    }
    for (const license of [
      'Llama 3.2 Community License',
      'Gemma Terms of Use',
      'Apache License 2.0 (Qwen 2.5)',
    ]) {
      expect(screen.getAllByText(license).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText(/Piper voices/).length).toBe(2);
  });
});
