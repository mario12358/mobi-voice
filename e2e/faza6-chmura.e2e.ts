import { by, device, element, expect, waitFor } from 'detox';

import { E2E_CLOUD_MODEL, E2E_VALID_KEY, e2eCloudAnswer } from '../src/e2e/fakeProvider';
import { E2E_TRANSCRIPT } from '../src/engines/fakes/FakeSttEngine';
import { pl } from '../src/i18n/pl';
import { goBack } from './helpers/device';

const TIMEOUT = 20000;

async function scrollTo(id: string, scroll: string) {
  await waitFor(element(by.id(id)))
    .toBeVisible()
    .whileElement(by.id(scroll))
    // From the middle: a swipe starting at the bottom edge is Android's "go home" gesture.
    .scroll(250, 'down', NaN, 0.5);
}

async function saveOpenAiKey(key: string) {
  await element(by.id('api-keys.openai.input')).replaceText(key);
  await element(by.id('api-keys.openai.save')).tap();
}

describe('Faza 6: modele w chmurze', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('refuses a wrong API key and saves a working one with its models', async () => {
    await element(by.id('topic-list.open-settings')).tap();
    await scrollTo('settings.open-api-keys', 'settings.scroll');
    await element(by.id('settings.open-api-keys')).tap();
    await waitFor(element(by.id('api-keys.openai.input')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await saveOpenAiKey('zly-klucz');
    await waitFor(element(by.id('api-keys.openai.error')))
      .toHaveText('Nieprawidłowy klucz API')
      .withTimeout(TIMEOUT);
    await expect(element(by.id('api-keys.openai.status'))).toHaveText(pl.apiKeys.missing);

    await saveOpenAiKey(E2E_VALID_KEY);
    await waitFor(element(by.id('api-keys.openai.status')))
      .toHaveText(pl.apiKeys.configured)
      .withTimeout(TIMEOUT);
    await expect(element(by.id('api-keys.openai.models'))).toHaveText(
      pl.apiKeys.models(`gpt-4o, ${E2E_CLOUD_MODEL}`),
    );
  });

  it('talks to the cloud model in a topic by text and by voice, and shows a lost connection', async () => {
    // Keys of the e2e build live in memory, so the app keeps running: back from the keys and the settings.
    await goBack();
    await goBack();
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('topic-list.new-topic')).tap();
    await waitFor(element(by.id('conversation.open-topic-model')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('conversation.open-topic-model')).tap();
    const cloudOption = `conversation.topic-model.cloud:openai:${E2E_CLOUD_MODEL}`;
    await scrollTo(cloudOption, 'conversation.topic-model.scroll');
    await element(by.id(cloudOption)).tap();
    await waitFor(element(by.text(pl.conversation.topicModel(E2E_CLOUD_MODEL))))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await element(by.id('conversation.input')).replaceText('Gdzie jechać latem?');
    await element(by.id('conversation.send')).tap();
    await waitFor(element(by.text(e2eCloudAnswer('Gdzie jechać latem?'))))
      .toExist()
      .withTimeout(TIMEOUT);

    await element(by.id('conversation.mic')).tap();
    await device.disableSynchronization();
    try {
      await element(by.id('e2e.speak')).tap();
      await waitFor(element(by.text(e2eCloudAnswer(E2E_TRANSCRIPT))))
        .toExist()
        .withTimeout(TIMEOUT);
      await waitFor(element(by.id('conversation.voice-state')))
        .toHaveText(pl.conversation.voiceState.listening)
        .withTimeout(TIMEOUT);
    } finally {
      await device.enableSynchronization();
    }
    await element(by.id('conversation.mic')).tap();

    await element(by.id('conversation.input')).replaceText('Test sieć');
    await element(by.id('conversation.send')).tap();
    await waitFor(element(by.text('Brak połączenia z siecią')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    // The cloud model's answers stay in the topic; no local answer took their place.
    await expect(element(by.text(e2eCloudAnswer('Gdzie jechać latem?')))).toExist();
    await expect(element(by.text('Brak połączenia z siecią'))).toBeVisible();
  });
});
