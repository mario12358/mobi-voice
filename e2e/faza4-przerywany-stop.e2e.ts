import { by, device, element, expect, waitFor } from 'detox';

import { E2E_CLOSING, E2E_PART } from '../src/e2e/testHooks';
import { pl } from '../src/i18n/pl';

const TIMEOUT = 20000;

async function startVoiceInNewTopic() {
  await element(by.id('topic-list.new-topic')).tap();
  await waitFor(element(by.id('conversation.mic')))
    .toBeVisible()
    .withTimeout(TIMEOUT);
}

async function expectVoiceState(label: string) {
  await waitFor(element(by.id('conversation.voice-state')))
    .toHaveText(label)
    .withTimeout(TIMEOUT);
}

describe('Faza 4: tryb przerywany i STOP', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('in interrupted mode waits through a pause and sends the whole utterance after "odbiór"', async () => {
    await startVoiceInNewTopic();
    await element(by.id('conversation.mode-toggle')).tap();
    await expect(element(by.text(pl.conversation.modeInterrupted))).toBeVisible();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);

    await element(by.id('e2e.speak-part')).tap();
    await waitFor(element(by.text(pl.conversation.youSaid(E2E_PART))))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expectVoiceState(pl.conversation.voiceState.listening);
    await expect(element(by.text(E2E_PART))).not.toExist();

    const sent = `${E2E_PART} co polecasz?`;
    await device.disableSynchronization();
    try {
      await element(by.id('e2e.speak-closing')).tap();
      await waitFor(element(by.text(`Odpowiedź testowa na: ${sent}. To jest drugie zdanie.`)))
        .toExist()
        .withTimeout(TIMEOUT);
    } finally {
      await device.enableSynchronization();
    }
    await expect(element(by.text(sent))).toExist();
    await expect(element(by.text(`${E2E_PART} ${E2E_CLOSING}`))).not.toExist();
  });

  it('"stop" said while the answer is read ends it, marks it and listens again', async () => {
    await startVoiceInNewTopic();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);

    await device.disableSynchronization();
    try {
      await element(by.id('e2e.speak-long')).tap();
      await expectVoiceState(pl.conversation.voiceState.speaking);
      await element(by.id('e2e.say-stop')).tap();
      await expectVoiceState(pl.conversation.voiceState.listening);
      await waitFor(element(by.text(pl.conversation.interrupted)))
        .toExist()
        .withTimeout(TIMEOUT);
    } finally {
      await device.enableSynchronization();
    }
    await expect(element(by.id('conversation.voice-stop'))).not.toExist();
  });

  it('the STOP button ends the answer being read like the spoken word', async () => {
    await startVoiceInNewTopic();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);

    await device.disableSynchronization();
    try {
      await element(by.id('e2e.speak-long')).tap();
      await expectVoiceState(pl.conversation.voiceState.speaking);
      await element(by.id('conversation.voice-stop')).tap();
      await expectVoiceState(pl.conversation.voiceState.listening);
      await waitFor(element(by.text(pl.conversation.interrupted)))
        .toExist()
        .withTimeout(TIMEOUT);
    } finally {
      await device.enableSynchronization();
    }
    await expect(element(by.id('conversation.voice-state'))).toHaveText(pl.conversation.voiceState.listening);
  });
});
