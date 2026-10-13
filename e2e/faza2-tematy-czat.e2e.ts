import { by, device, element, expect, waitFor } from 'detox';

import { E2E_TOPIC_TITLE } from '../src/engines/fakes/FakeLlmEngine';
import { goBack } from './helpers/device';

const TIMEOUT = 15000;

async function send(text: string) {
  await element(by.id('conversation.input')).replaceText(text);
  await element(by.id('conversation.send')).tap();
}

async function waitForIdle() {
  await waitFor(element(by.id('conversation.send')))
    .toBeVisible()
    .withTimeout(TIMEOUT);
}

describe('Faza 2: tematy i czat tekstowy', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('creates a topic and chats with the model, which titles the topic', async () => {
    await element(by.id('topic-list.new-topic')).tap();
    await waitFor(element(by.id('conversation-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await send('Gdzie jechać nad jezioro?');
    await waitForIdle();

    const answer = 'Odpowiedź testowa na: Gdzie jechać nad jezioro?. To jest drugie zdanie.';
    await expect(element(by.text('Gdzie jechać nad jezioro?'))).toBeVisible();
    await waitFor(element(by.text(answer)))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    // The fake model's echo becomes the automatic title shown in the header.
    await waitFor(element(by.text(E2E_TOPIC_TITLE)))
      .toExist()
      .withTimeout(TIMEOUT);
  });

  it('STOP interrupts a streamed answer and marks it', async () => {
    // Streaming keeps timers busy; without this Detox would wait for the whole answer before tapping STOP.
    await device.disableSynchronization();
    try {
      await send('Opowiedz długo o Mazurach');
      await waitFor(element(by.id('conversation.streaming')))
        .toBeVisible()
        .withTimeout(TIMEOUT);
      await element(by.id('conversation.stop')).tap();
      await waitFor(element(by.text('przerwano')))
        .toExist()
        .withTimeout(TIMEOUT);
    } finally {
      await device.enableSynchronization();
    }
    await expect(element(by.id('conversation.streaming'))).not.toExist();
  });

  it('renames, searches and deletes topics on the list', async () => {
    await goBack();
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await element(by.id('topic-list.new-topic')).tap();
    await waitFor(element(by.id('conversation-screen')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await goBack();

    await element(by.label('Zmień nazwę tematu Nowa rozmowa')).tap();
    await element(by.id('topic-list.rename-input')).replaceText('Remont kuchni');
    await element(by.id('topic-list.rename-save')).tap();
    // iOS will not present another modal until the previous one has finished dismissing.
    await waitFor(element(by.id('topic-list.rename-input')))
      .not.toExist()
      .withTimeout(TIMEOUT);
    await waitFor(element(by.text('Remont kuchni')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await element(by.id('topic-list.search')).replaceText('remont');
    await expect(element(by.text('Remont kuchni'))).toBeVisible();
    await element(by.id('topic-list.search')).replaceText('');

    await element(by.label('Usuń temat Remont kuchni')).tap();
    await waitFor(element(by.id('topic-list.delete-dialog.confirm')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('topic-list.delete-dialog.confirm')).tap();
    await waitFor(element(by.text('Remont kuchni')))
      .not.toExist()
      .withTimeout(TIMEOUT);
  });

  it('reopens the last active topic with its history after a restart', async () => {
    await device.launchApp({ newInstance: true });

    // The whole-screen container fails Detox's 75% visibility heuristic on iOS; its content is what matters.
    await waitFor(element(by.id('conversation-screen')))
      .toExist()
      .withTimeout(30000);
    await waitFor(element(by.text('Gdzie jechać nad jezioro?')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.text('przerwano'))).toExist();
  });
});
