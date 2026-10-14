import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { MemoryApiKeys } from '../../../cloud/__tests__/support/memoryApiKeys';
import { recordedServer, type Recording } from '../../../cloud/__tests__/support/recordedServer';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { pl } from '../../../i18n/pl';
import type { RootStackParamList } from '../../../navigation/types';
import { ApiKeysScreen } from '../ApiKeysScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

describe('ApiKeysScreen', () => {
  let db: SqlDatabase;
  let keys: MemoryApiKeys;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    keys = new MemoryApiKeys();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  async function renderKeys(...recordings: Recording[]) {
    const server = recordedServer(...recordings);
    await render(
      <TestProviders db={db} ports={{ apiKeys: keys, fetch: server.fetch }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="ApiKeys" component={ApiKeysScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </TestProviders>,
    );
    await screen.findByTestId('api-keys.openai.status');
    return server.calls;
  }

  async function enterKey(provider: string, key: string) {
    await fireEvent.changeText(screen.getByTestId(`api-keys.${provider}.input`), key);
    await fireEvent.press(screen.getByTestId(`api-keys.${provider}.save`));
  }

  it('lists the four providers without keys', async () => {
    await renderKeys();

    for (const provider of ['openai', 'anthropic', 'google', 'meta']) {
      expect(screen.getByTestId(`api-keys.${provider}.status`)).toHaveTextContent(pl.apiKeys.missing);
    }
  });

  // specky: crit 01M4TPSD3NM3BC0R81WPKKS9GV
  it('checks a key with a test request and does not store a refused one', async () => {
    const calls = await renderKeys({ status: 401, chunks: ['{"error":{}}'] });

    await enterKey('openai', 'wrong-key');

    expect(await screen.findByTestId('api-keys.openai.error')).toHaveTextContent('Nieprawidłowy klucz API');
    expect(calls[0]).toMatchObject({ url: 'https://api.openai.com/v1/models', method: 'GET' });
    expect(keys.keys.has('openai')).toBe(false);
    expect(screen.getByTestId('api-keys.openai.status')).toHaveTextContent(pl.apiKeys.missing);
  });

  it('stores a working key, shows the provider models and removes the key on request', async () => {
    await renderKeys(
      { status: 200, chunks: ['{"data":[]}'] },
      { status: 200, chunks: ['{"data":[{"id":"claude-sonnet-5-5"},{"id":"claude-haiku-5-5"}]}'] },
    );

    await enterKey('anthropic', '  good-anthropic-key  ');

    await waitFor(() =>
      expect(screen.getByTestId('api-keys.anthropic.status')).toHaveTextContent(pl.apiKeys.configured),
    );
    expect(keys.keys.get('anthropic')).toBe('good-anthropic-key');
    expect(screen.getByTestId('api-keys.anthropic.models')).toHaveTextContent(
      pl.apiKeys.models('claude-haiku-5-5, claude-sonnet-5-5'),
    );
    expect(screen.getByTestId('api-keys.anthropic.input').props.value).toBe('');

    await fireEvent.press(screen.getByTestId('api-keys.anthropic.remove'));
    await waitFor(() =>
      expect(screen.getByTestId('api-keys.anthropic.status')).toHaveTextContent(pl.apiKeys.missing),
    );
    expect(keys.keys.has('anthropic')).toBe(false);
  });

  it('shows the models of a provider whose key was saved before', async () => {
    await keys.setApiKey('google', 'saved-google-key');
    await renderKeys({
      status: 200,
      chunks: [
        '{"models":[{"name":"models/gemini-2.5-flash","supportedGenerationMethods":["generateContent"]}]}',
      ],
    });

    expect(await screen.findByTestId('api-keys.google.models')).toHaveTextContent(
      pl.apiKeys.models('gemini-2.5-flash'),
    );
  });
});
