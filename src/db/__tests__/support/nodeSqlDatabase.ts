import Database from 'better-sqlite3';

import type { RunResult, SqlDatabase, SqlValue } from '../../SqlDatabase';

// better-sqlite3 errors come from another realm when Jest runs workers, so `toThrow` would not see them.
function sameRealm<TResult>(operation: () => TResult): TResult {
  try {
    return operation();
  } catch (error) {
    throw new Error(error instanceof Object && 'message' in error ? String(error.message) : String(error));
  }
}

// Node-side SqlDatabase for Jest: same SQLite engine as expo-sqlite, without the native module.
export function openNodeSqlDatabase(filename = ':memory:'): SqlDatabase {
  const db = new Database(filename);
  return {
    async execAsync(source: string): Promise<void> {
      sameRealm(() => db.exec(source));
    },
    async runAsync(source: string, params: SqlValue[] = []): Promise<RunResult> {
      const result = sameRealm(() => db.prepare(source).run(...params));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
    },
    async getAllAsync<TRow>(source: string, params: SqlValue[] = []): Promise<TRow[]> {
      return sameRealm(() => db.prepare(source).all(...params) as TRow[]);
    },
    async getFirstAsync<TRow>(source: string, params: SqlValue[] = []): Promise<TRow | null> {
      return sameRealm(() => (db.prepare(source).get(...params) as TRow | undefined) ?? null);
    },
    async withTransactionAsync(task: () => Promise<void>): Promise<void> {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async closeAsync(): Promise<void> {
      db.close();
    },
  };
}
