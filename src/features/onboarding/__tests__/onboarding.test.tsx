import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TestProviders } from '../../../__tests__/support/TestProviders';
import { openNodeSqlDatabase } from '../../../db/__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../../db/migrate';
import type { SqlDatabase } from '../../../db/SqlDatabase';
import { createTestFactories, EngineRegistry } from '../../../engines/EngineRegistry';
import { pl } from '../../../i18n/pl';
import { RootNavigator } from '../../../navigation/RootNavigator';
import { useSettingsStore } from '../../../state/settings';
import { CatalogFileSystem } from '../../../e2e/CatalogFileSystem';

describe('first-run wizard', () => {
  let db: SqlDatabase;
  let fileSystem: CatalogFileSystem;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
    fileSystem = new CatalogFileSystem();
    useSettingsStore.getState().reset();
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  // A regular build (production engines); the wizard never shows in e2e builds with fake engines.
  // `run` keys the providers: a new value remounts the whole app, like the next start of the phone app.
  function app(mode: 'production' | 'test', run = 1) {
    return (
      <TestProviders
        key={run}
        db={db}
        engines={new EngineRegistry(mode, createTestFactories())}
        ports={{ fileSystem, memoryBytes: () => 8_000_000_000 }}
      >
        <RootNavigator />
      </TestProviders>
    );
  }

  async function startApp(mode: 'production' | 'test' = 'production') {
    await render(app(mode));
  }

  // specky: crit 01M4TPSCTRFJVN1RZX3P717BYQ
  it('greets the first run without models and downloads whisper, a voice and Qwen 2.5 1.5B', async () => {
    await startApp();

    expect(await screen.findByTestId('onboarding-screen')).toBeTruthy();
    expect(screen.getByTestId('onboarding.step-whisper-small')).toBeTruthy();
    expect(screen.getByTestId('onboarding.step-piper-pl_PL-gosia-medium')).toBeTruthy();
    expect(screen.getByTestId('onboarding.step-qwen2.5-1.5b')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('onboarding.voice-darkman'));
    expect(screen.getByTestId('onboarding.step-piper-pl_PL-darkman-medium')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('onboarding.download-all'));
    await screen.findByTestId('onboarding.done', {}, { timeout: 3_000 });
    for (const id of ['whisper-small', 'piper-pl_PL-darkman-medium', 'qwen2.5-1.5b']) {
      expect(screen.getByTestId(`onboarding.status-${id}`)).toHaveTextContent(pl.models.downloaded);
    }

    await fireEvent.press(screen.getByTestId('onboarding.done'));
    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
  });

  // specky: crit 01M4TPSCTRC2WYRFBHHV417XND
  it('does not come back on later starts once finished, even if skipped', async () => {
    await startApp();
    await fireEvent.press(await screen.findByTestId('onboarding.skip'));
    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
    expect(useSettingsStore.getState().onboardingDone).toBe(true);

    await screen.rerender(app('production', 2));

    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
    expect(screen.queryByTestId('onboarding-screen')).toBeNull();
  });

  it('skips the wizard when the default models are already on the phone', async () => {
    for (const entry of ['whisper-small', 'piper-pl_PL-gosia-medium', 'espeak-ng-data-pl', 'qwen2.5-1.5b']) {
      await fileSystem.preload(entry);
    }
    await startApp();

    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
    await waitFor(() => expect(useSettingsStore.getState().onboardingDone).toBe(true));
  });

  it('never shows in builds with fake engines', async () => {
    await startApp('test');

    expect(await screen.findByTestId('topic-list-screen')).toBeTruthy();
  });
});
