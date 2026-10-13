import { by, device, element, expect, waitFor } from 'detox';

import { goBack, setSystemAppearance } from './helpers/device';

describe('Faza 1: start, nawigacja i motyw', () => {
  beforeAll(async () => {
    setSystemAppearance('light');
    await device.launchApp({ newInstance: true, delete: true });
  });

  afterAll(() => {
    setSystemAppearance('light');
  });

  it('starts on the topic list with test engines', async () => {
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
    await expect(element(by.id('engine-mode-test'))).toExist();
  });

  it('goes from the topic list to settings and models and back', async () => {
    await element(by.id('topic-list.open-settings')).tap();
    await expect(element(by.id('settings-screen'))).toBeVisible();
    await element(by.id('settings.open-models')).tap();
    await expect(element(by.id('models-screen'))).toBeVisible();

    await goBack();
    await expect(element(by.id('settings-screen'))).toBeVisible();
    await goBack();
    await expect(element(by.id('topic-list-screen'))).toBeVisible();
  });

  it('follows the system light and dark appearance', async () => {
    await expect(element(by.id('theme-light'))).toExist();

    setSystemAppearance('dark');
    await waitFor(element(by.id('theme-dark')))
      .toExist()
      .withTimeout(10000);

    setSystemAppearance('light');
    await waitFor(element(by.id('theme-light')))
      .toExist()
      .withTimeout(10000);
  });
});
