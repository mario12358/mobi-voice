import { by, device, element, expect, waitFor } from 'detox';

import { E2E_TRANSCRIPT } from '../src/engines/fakes/FakeSttEngine';
import { pl } from '../src/i18n/pl';

const TIMEOUT = 20000;

async function openNewTopic() {
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

describe('Faza 3: rozmowa głosowa w trybie ciągłym', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
  });

  it('hears an utterance, answers in the chat and aloud, then listens again', async () => {
    await openNewTopic();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);

    // The fake answer is streamed and read aloud for a while; Detox would otherwise wait for it to end.
    await device.disableSynchronization();
    try {
      await element(by.id('e2e.speak')).tap();
      await waitFor(element(by.text(pl.conversation.youSaid(E2E_TRANSCRIPT))))
        .toBeVisible()
        .withTimeout(TIMEOUT);
      await expectVoiceState(pl.conversation.voiceState.speaking);
      await waitFor(element(by.text(`Odpowiedź testowa na: ${E2E_TRANSCRIPT}. To jest drugie zdanie.`)))
        .toExist()
        .withTimeout(TIMEOUT);
      await expectVoiceState(pl.conversation.voiceState.listening);
    } finally {
      await device.enableSynchronization();
    }

    // Both sides of the exchange stay in the topic's chat.
    await expect(element(by.text(E2E_TRANSCRIPT))).toExist();
    await element(by.id('conversation.mic')).tap();
    await expect(element(by.id('conversation.voice-state'))).toHaveText(pl.conversation.voiceState.idle);
  });

  it('keeps the text chat working when the microphone is denied', async () => {
    await openNewTopic();
    await element(by.id('e2e.deny-mic')).tap();
    await element(by.id('conversation.mic')).tap();

    await waitFor(element(by.id('conversation.mic-denied')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('conversation.open-system-settings'))).toBeVisible();

    await element(by.id('conversation.input')).replaceText('Piszę zamiast mówić');
    await element(by.id('conversation.send')).tap();
    await waitFor(element(by.text('Odpowiedź testowa na: Piszę zamiast mówić. To jest drugie zdanie.')))
      .toExist()
      .withTimeout(TIMEOUT);
  });
});
