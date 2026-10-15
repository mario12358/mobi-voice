import { by, device, element, expect, waitFor } from 'detox';

import { pl } from '../src/i18n/pl';
import { COMMAND_REPLIES } from '../src/services/voice/TopicCommands';
import { sayText } from './helpers/voice';

const TIMEOUT = 20000;

async function expectVoiceState(label: string) {
  await waitFor(element(by.id('conversation.voice-state')))
    .toHaveText(label)
    .withTimeout(TIMEOUT);
}

// The fake STT "hears" the sentence in the next injected utterance; the reply is read, then the
// session listens again.
async function say(sentence: string, reply: string) {
  await sayText(sentence);
  // What was said back is steadier to wait on than the brief "speaking" state on a slow CI simulator.
  await waitFor(element(by.id('e2e.spoken')))
    .toHaveText(pl.common.e2eSpoken(reply))
    .withTimeout(TIMEOUT);
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
    await say('Nowy temat Zakupy na weekend', COMMAND_REPLIES.created('Zakupy na weekend'));
    await expectTopicOpen('Zakupy na weekend');
    await say('Nowy temat Zakupy świąteczne', COMMAND_REPLIES.created('Zakupy świąteczne'));
    await expectTopicOpen('Zakupy świąteczne');
    await say('Nowy temat Wakacje nad morzem', COMMAND_REPLIES.created('Wakacje nad morzem'));
    await expectTopicOpen('Wakacje nad morzem');
    // Commands are not conversation: the new topic has no messages.
    await expect(element(by.text(pl.conversation.emptyHistory))).toExist();
  });

  it('asks back when the name fits two topics, then opens the one named', async () => {
    await say('Przełącz na temat zakupy', COMMAND_REPLIES.which(['Zakupy świąteczne', 'Zakupy na weekend']));
    // Still in the same topic while the app asks which one.
    await expect(element(by.text('Wakacje nad morzem'))).toExist();

    await say('na weekend', COMMAND_REPLIES.switched('Zakupy na weekend'));
    await expectTopicOpen('Zakupy na weekend');
    await expect(element(by.text('Wakacje nad morzem'))).not.toExist();
  });

  it('"przełącz na temat X" opens the topic with the most similar name', async () => {
    await say('Przełącz na temat wakacje', COMMAND_REPLIES.switched('Wakacje nad morzem'));
    await expectTopicOpen('Wakacje nad morzem');
    await expect(element(by.text('Zakupy na weekend'))).not.toExist();
  });

  it('"jakie mam tematy" shows the recent topics', async () => {
    await say(
      'Jakie mam tematy?',
      COMMAND_REPLIES.list([
        'Wakacje nad morzem',
        'Zakupy świąteczne',
        'Zakupy na weekend',
        pl.topicList.defaultTitle,
      ]),
    );
    await waitFor(element(by.id('conversation.topic-list')))
      .toExist()
      .withTimeout(TIMEOUT);
    // The header shows "Wakacje nad morzem"; the other titles can only come from the list.
    for (const title of ['Zakupy na weekend', 'Zakupy świąteczne']) {
      await expect(element(by.text(title))).toExist();
    }
  });
});
