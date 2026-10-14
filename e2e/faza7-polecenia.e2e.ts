import { by, device, element, expect, waitFor } from 'detox';

import { pl } from '../src/i18n/pl';

const TIMEOUT = 20000;

async function expectVoiceState(label: string) {
  await waitFor(element(by.id('conversation.voice-state')))
    .toHaveText(label)
    .withTimeout(TIMEOUT);
}

// The fake STT "hears" the sentence in the next injected utterance; the reply is read, then the
// session listens again.
async function say(sentence: string) {
  await element(by.id('e2e.utterance')).replaceText(sentence);
  await element(by.id('e2e.say-text')).tap();
  await expectVoiceState(pl.conversation.voiceState.speaking);
  await expectVoiceState(pl.conversation.voiceState.listening);
}

async function expectTopicOpen(title: string) {
  await waitFor(element(by.text(title)))
    .toExist()
    .withTimeout(TIMEOUT);
}

describe('Faza 7: polecenia głosowe', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
    await element(by.id('topic-list.new-topic')).tap();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);
    // Voice sessions keep timers running; Detox would otherwise wait for them forever.
    await device.disableSynchronization();
  });

  afterAll(async () => {
    await device.enableSynchronization();
  });

  it('"nowy temat X" creates topic X and continues the session in it', async () => {
    await say('Nowy temat Zakupy na weekend');
    await expectTopicOpen('Zakupy na weekend');
    await say('Nowy temat Zakupy świąteczne');
    await expectTopicOpen('Zakupy świąteczne');
    await say('Nowy temat Wakacje nad morzem');
    await expectTopicOpen('Wakacje nad morzem');
    // Commands are not conversation: the new topic has no messages.
    await expect(element(by.text(pl.conversation.emptyHistory))).toExist();
  });

  it('asks back when the name fits two topics, then opens the one named', async () => {
    await say('Przełącz na temat zakupy');
    // Still in the same topic while the app asks which one.
    await expect(element(by.text('Wakacje nad morzem'))).toExist();

    await say('na weekend');
    await expectTopicOpen('Zakupy na weekend');
    await expect(element(by.text('Wakacje nad morzem'))).not.toExist();
  });

  it('"przełącz na temat X" opens the topic with the most similar name', async () => {
    await say('Przełącz na temat wakacje');
    await expectTopicOpen('Wakacje nad morzem');
    await expect(element(by.text('Zakupy na weekend'))).not.toExist();
  });

  it('"jakie mam tematy" shows the recent topics', async () => {
    await say('Jakie mam tematy?');
    await waitFor(element(by.id('conversation.topic-list')))
      .toExist()
      .withTimeout(TIMEOUT);
    // The header shows "Wakacje nad morzem"; the other titles can only come from the list.
    for (const title of ['Zakupy na weekend', 'Zakupy świąteczne']) {
      await expect(element(by.text(title))).toExist();
    }
  });
});
