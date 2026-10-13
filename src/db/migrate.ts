import { DomainError } from '../core/errors';
import { MIGRATIONS } from './migrations';
import type { Migration } from './migrations/Migration';
import type { SqlDatabase } from './SqlDatabase';

const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL
)`;

async function appliedVersions(db: SqlDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations');
  return new Set(rows.map((row) => row.version));
}

async function runStatements(db: SqlDatabase, statements: string[]): Promise<void> {
  for (const statement of statements) {
    await db.execAsync(statement);
  }
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new DomainError('storage_error', `Migration ${migration.name} has version ${migration.version}`);
    }
  });
}

export async function migrate(
  db: SqlDatabase,
  migrations: readonly Migration[] = MIGRATIONS,
  now: () => number = Date.now,
): Promise<number[]> {
  assertOrdered(migrations);
  await db.execAsync(MIGRATIONS_TABLE);
  const applied = await appliedVersions(db);
  const pending = migrations.filter((migration) => !applied.has(migration.version));
  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await runStatements(db, migration.up);
      await db.runAsync('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        migration.version,
        migration.name,
        now(),
      ]);
    });
  }
  return pending.map((migration) => migration.version);
}

export async function rollbackTo(
  db: SqlDatabase,
  targetVersion: number,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number[]> {
  const applied = await appliedVersions(db);
  const toRevert = migrations
    .filter((migration) => migration.version > targetVersion && applied.has(migration.version))
    .reverse();
  for (const migration of toRevert) {
    await db.withTransactionAsync(async () => {
      await runStatements(db, migration.down);
      await db.runAsync('DELETE FROM schema_migrations WHERE version = ?', [migration.version]);
    });
  }
  return toRevert.map((migration) => migration.version);
}

export async function prepareDatabase(db: SqlDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrate(db);
}
