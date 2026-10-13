import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { prepareDatabase } from './migrate';
import type { SqlDatabase, SqlValue } from './SqlDatabase';

export const DATABASE_NAME = 'mobivoice.db';

function fromExpo(db: SQLiteDatabase): SqlDatabase {
  return {
    execAsync: (source) => db.execAsync(source),
    runAsync: (source, params: SqlValue[] = []) => db.runAsync(source, params),
    getAllAsync: (source, params: SqlValue[] = []) => db.getAllAsync(source, params),
    getFirstAsync: (source, params: SqlValue[] = []) => db.getFirstAsync(source, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
    closeAsync: () => db.closeAsync(),
  };
}

export async function openAppDatabase(): Promise<SqlDatabase> {
  const db = fromExpo(await openDatabaseAsync(DATABASE_NAME));
  await db.execAsync('PRAGMA journal_mode = WAL');
  await prepareDatabase(db);
  return db;
}
