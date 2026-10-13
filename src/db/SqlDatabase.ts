export type SqlValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

// The subset of expo-sqlite's SQLiteDatabase the app relies on; tests provide a Node implementation.
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlValue[]): Promise<RunResult>;
  getAllAsync<TRow>(source: string, params?: SqlValue[]): Promise<TRow[]>;
  getFirstAsync<TRow>(source: string, params?: SqlValue[]): Promise<TRow | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}
