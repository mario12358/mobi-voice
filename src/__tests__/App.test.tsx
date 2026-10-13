import { render, screen } from '@testing-library/react-native';

import App from '../App';
import { openNodeSqlDatabase } from '../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../db/migrate';
import type { SqlDatabase } from '../db/SqlDatabase';

const mockOpenAppDatabase = jest.fn<Promise<SqlDatabase>, []>();

jest.mock('../db/openDatabase', () => ({
  openAppDatabase: () => mockOpenAppDatabase(),
}));

describe('App', () => {
  let db: SqlDatabase;

  beforeEach(() => {
    db = openNodeSqlDatabase();
    mockOpenAppDatabase.mockReset();
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
    expect(screen.queryByRole('header', { name: 'MobiVoice' })).toBeNull();
    expect(screen.getByLabelText('Ładowanie danych')).toBeTruthy();

    await prepareDatabase(db);
    resolveOpen(db);

    expect(await screen.findByRole('header', { name: 'MobiVoice' })).toBeTruthy();
    expect(await db.getAllAsync('SELECT version FROM schema_migrations')).toEqual([{ version: 1 }]);
  });

  it('shows a storage error instead of the app when the database cannot be opened', async () => {
    mockOpenAppDatabase.mockRejectedValue(new Error('disk I/O error'));

    await render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Błąd zapisu danych na urządzeniu');
    expect(screen.queryByRole('header', { name: 'MobiVoice' })).toBeNull();
  });
});
