import AsyncStorage from '@react-native-async-storage/async-storage';

import { openNodeSqlDatabase } from '../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../db/migrate';
import { MessageRepository } from '../../db/repositories/MessageRepository';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import { SecretStore } from '../SecretStore';
import { useSettingsStore } from '../settings';

jest.mock('expo-secure-store', () => require('./support/memorySecureStore').createMemorySecureStore());

const API_KEY = 'test-anthropic-key-SECRET-42';

async function asyncStorageDump(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const entries = await AsyncStorage.multiGet(keys);
  return JSON.stringify(entries);
}

describe('API key storage', () => {
  // specky: crit 01M4TPSDFM4FPPHT855MEXC1P9
  it('a saved API key is not present in SQLite nor in AsyncStorage', async () => {
    const db = openNodeSqlDatabase();
    await prepareDatabase(db);
    const topic = await new TopicRepository(db).create('Rozmowa z Claude');
    await new MessageRepository(db).add({ topicId: topic.id, role: 'user', content: 'Cześć' });

    await SecretStore.setApiKey('anthropic', API_KEY);
    useSettingsStore.getState().update({ defaultModelId: 'anthropic:claude', ttsVoice: 'darkman' });

    expect(await SecretStore.getApiKey('anthropic')).toBe(API_KEY);
    expect(await asyncStorageDump()).not.toContain('SECRET');
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    );
    for (const { name } of tables) {
      const rows = await db.getAllAsync(`SELECT * FROM ${name}`);
      expect(JSON.stringify(rows)).not.toContain('SECRET');
    }
    expect(tables.length).toBeGreaterThan(0);
    await db.closeAsync();
  });
});
