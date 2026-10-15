import { by, device, element, expect, waitFor } from 'detox';

import { pl } from '../src/i18n/pl';

const TIMEOUT = 20000;

async function openSettings() {
  await element(by.id('topic-list.open-settings')).tap();
  await waitFor(element(by.id('settings-screen')))
    .toExist()
    .withTimeout(TIMEOUT);
}

async function scrollTo(id: string, scroll: string) {
  await waitFor(element(by.id(id)))
    .toBeVisible()
    .whileElement(by.id(scroll))
    // From the middle: a swipe starting at the bottom edge is Android's "go home" gesture.
    .scroll(250, 'down', NaN, 0.5);
}

describe('Faza 5: modele i ustawienia', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('the first-run wizard downloads whisper, a voice and Qwen 2.5 1.5B, then opens the topics', async () => {
    await openSettings();
    await scrollTo('e2e.open-onboarding', 'settings.scroll');
    await element(by.id('e2e.open-onboarding')).tap();
    await waitFor(element(by.id('onboarding-screen')))
      .toExist()
      .withTimeout(TIMEOUT);

    await element(by.id('onboarding.voice-darkman')).tap();
    await element(by.id('onboarding.download-all')).tap();
    await waitFor(element(by.id('onboarding.done')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('onboarding.status-qwen2.5-1.5b'))).toHaveText(pl.models.downloaded);
    await element(by.id('onboarding.done')).tap();

    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });

  it('the model manager downloads and deletes a model and warns about models too big for the phone', async () => {
    await openSettings();
    await element(by.id('settings.open-models')).tap();
    await waitFor(element(by.id('models-screen')))
      .toExist()
      .withTimeout(TIMEOUT);

    await expect(element(by.id('models.not-recommended-llama3.2-3b'))).toExist();
    await expect(element(by.id('models.not-recommended-qwen2.5-1.5b'))).not.toExist();

    await scrollTo('models.download-whisper-base', 'models.scroll');
    await element(by.id('models.download-whisper-base')).tap();
    await waitFor(element(by.id('models.delete-whisper-base')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('models.status-whisper-base'))).toHaveText(pl.models.downloaded);

    await element(by.id('models.delete-whisper-base')).tap();
    await element(by.id('models.delete-dialog.confirm')).tap();
    await waitFor(element(by.id('models.status-whisper-base')))
      .toHaveText(pl.models.missing)
      .withTimeout(TIMEOUT);
  });

  it('remembers the voice, the conversation mode and the silence threshold after a restart', async () => {
    await openSettings();
    await scrollTo('settings.voice-darkman', 'settings.scroll');
    await element(by.id('settings.voice-darkman')).tap();
    await scrollTo('settings.mode-interrupted', 'settings.scroll');
    await element(by.id('settings.mode-interrupted')).tap();
    await scrollTo('settings.silence-more', 'settings.scroll');
    await element(by.id('settings.silence-more')).tap();
    await expect(element(by.id('settings.silence-value'))).toHaveText('3,5 s');

    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
    await openSettings();
    await scrollTo('settings.silence-value', 'settings.scroll');
    await expect(element(by.id('settings.silence-value'))).toHaveText('3,5 s');
    await expect(element(by.id('settings.mode-interrupted'))).toExist();
  });

  it('a topic can talk to its own model', async () => {
    await element(by.id('topic-list.new-topic')).tap();
    await waitFor(element(by.id('conversation.open-topic-model')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.text(pl.conversation.topicModel('Qwen 2.5 1.5B')))).toBeVisible();

    await element(by.id('conversation.open-topic-model')).tap();
    await element(by.id('conversation.topic-model.llama3.2-1b')).tap();

    await waitFor(element(by.text(pl.conversation.topicModel('Llama 3.2 1B'))))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });
});
