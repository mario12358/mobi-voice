import { render, screen } from '@testing-library/react-native';

import App from '../App';
import { openNodeSqlDatabase } from '../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../db/migrate';
import { MIGRATIONS } from '../db/migrations';
import type { SqlDatabase } from '../db/SqlDatabase';
import { useSettingsStore } from '../state/settings';

const mockOpenAppDatabase = jest.fn<Promise<SqlDatabase>, []>();

jest.mock('../db/openDatabase', () => ({
  openAppDatabase: () => mockOpenAppDatabase(),
}));

describe('App', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = openNodeSqlDatabase();
    mockOpenAppDatabase.mockReset();
    // A returning user: the first-run wizard is behind them.
    useSettingsStore.getState().reset();
    useSettingsStore.getState().update({ onboardingDone: true });
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // specky: crit 01M4TPSB44R4TGWZV7K4HZT7HV
  it('runs migrations at startup before showing the first screen', async () => {
    let resolveOpen: (value: SqlDatabase) => void = () => undefined;
    mockOpenAppDatabase.mockImplementation(
      () =>
        new Promise<SqlDatabase>((resolve) => {
          resolveOpen = resolve;
        }),
    );

    await render(<App />);
    expect(screen.queryByTestId('topic-list-screen')).toBeNull();
    expect(screen.getByLabelText('Ładowanie danych')).toBeTruthy();

    await prepareDatabase(db);
    resolveOpen(db);

    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
    expect(await db.getAllAsync('SELECT version FROM schema_migrations')).toEqual(
      MIGRATIONS.map(({ version }) => ({ version })),
    );
  });

  it('shows a storage error instead of the app when the database cannot be opened', async () => {
    mockOpenAppDatabase.mockRejectedValue(new Error('disk I/O error'));

    await render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Błąd zapisu danych na urządzeniu');
    expect(screen.queryByTestId('topic-list-screen')).toBeNull();
  });

  describe('engine mode from the e2e build flag', () => {
    const originalFlag = process.env.EXPO_PUBLIC_E2E;

    afterEach(() => {
      process.env.EXPO_PUBLIC_E2E = originalFlag;
    });

    it('runs on test engines in an e2e build', async () => {
      process.env.EXPO_PUBLIC_E2E = '1';
      await prepareDatabase(db);
      mockOpenAppDatabase.mockResolvedValue(db);

      await render(<App />);

      expect(await screen.findByTestId('engine-mode-test')).toHaveTextContent('Tryb testowy');
    });

    it('runs on production engines in a regular build', async () => {
      delete process.env.EXPO_PUBLIC_E2E;
      await prepareDatabase(db);
      mockOpenAppDatabase.mockResolvedValue(db);

      await render(<App />);

      expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
      expect(screen.queryByTestId('engine-mode-test')).toBeNull();
    });
  });
});
