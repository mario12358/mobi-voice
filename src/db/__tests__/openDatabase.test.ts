import { MIGRATIONS } from '../migrations';
import { openAppDatabase, DATABASE_NAME } from '../openDatabase';
import type { SqlDatabase } from '../SqlDatabase';
import { openNodeSqlDatabase } from './support/nodeSqlDatabase';

const mockOpenDatabaseAsync = jest.fn<Promise<SqlDatabase>, [string]>();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (name: string) => mockOpenDatabaseAsync(name),
}));

describe('openAppDatabase', () => {
  it('opens the app database with foreign keys enabled and the schema migrated', async () => {
    const nodeDb = openNodeSqlDatabase();
    mockOpenDatabaseAsync.mockResolvedValue(nodeDb);

    const db = await openAppDatabase();

    expect(mockOpenDatabaseAsync).toHaveBeenCalledWith(DATABASE_NAME);
    expect(await db.getFirstAsync('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
    expect(await db.getAllAsync('SELECT version FROM schema_migrations')).toEqual(
      MIGRATIONS.map(({ version }) => ({ version })),
    );
    await db.closeAsync();
  });
});
