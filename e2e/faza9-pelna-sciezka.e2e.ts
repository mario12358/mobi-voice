import { by, device, element, expect, waitFor } from 'detox';

import { BUILTIN_TEMPLATES } from '../src/db/repositories/SummaryTemplateRepository';
import { E2E_LONG_QUESTION } from '../src/e2e/testHooks';
import { E2E_SUMMARY_PREFIX } from '../src/engines/fakes/FakeLlmEngine';
import { pl } from '../src/i18n/pl';
import { goBack } from './helpers/device';
import { sayText } from './helpers/voice';

const TIMEOUT = 20000;
const note = BUILTIN_TEMPLATES.find((template) => template.name === 'Notatka')!;

async function waitForTopicList() {
  await waitFor(element(by.id('topic-list-screen')))
    .toBeVisible()
    .withTimeout(30000);
}

async function openSettings() {
  await element(by.id('topic-list.open-settings')).tap();
  await waitFor(element(by.id('settings-screen')))
    .toExist()
    .withTimeout(TIMEOUT);
}

// From the middle of the screen: a swipe starting at the bottom edge is Android's "go home" gesture.
async function scrollTo(id: string, scroll: string) {
  await waitFor(element(by.id(id)))
    .toBeVisible()
    .whileElement(by.id(scroll))
    .scroll(250, 'down', NaN, 0.5);
}

async function expectVoiceState(label: string) {
  await waitFor(element(by.id('conversation.voice-state')))
    .toHaveText(label)
    .withTimeout(TIMEOUT);
}

describe('Faza 9: zgoda na raporty awarii i pełna ścieżka', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitForTopicList();
  });

  it('crash reports are off on a fresh install and the consent given in Settings survives a restart', async () => {
    await openSettings();
    await scrollTo('settings.crash-reports', 'settings.scroll');
    await expect(element(by.id('settings.crash-reports'))).toHaveToggleValue(false);
    await expect(element(by.text(pl.settings.crashReportsHint))).toExist();

    await element(by.id('settings.crash-reports')).tap();
    await expect(element(by.id('settings.crash-reports'))).toHaveToggleValue(true);

    await device.launchApp({ newInstance: true });
    await waitForTopicList();
    await openSettings();
    await scrollTo('settings.crash-reports', 'settings.scroll');
    await expect(element(by.id('settings.crash-reports'))).toHaveToggleValue(true);
  });

  it('wizard, new topic, voice conversation, STOP and a summary of the whole topic', async () => {
    await openSettings();
    await scrollTo('e2e.open-onboarding', 'settings.scroll');
    await element(by.id('e2e.open-onboarding')).tap();
    await waitFor(element(by.id('onboarding-screen')))
      .toExist()
      .withTimeout(TIMEOUT);
    await element(by.id('onboarding.voice-gosia')).tap();
    await element(by.id('onboarding.download-all')).tap();
    await waitFor(element(by.id('onboarding.done')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('onboarding.done')).tap();
    await waitForTopicList();

    await element(by.id('topic-list.new-topic')).tap();
    await waitFor(element(by.id('conversation.mic')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);

    await device.disableSynchronization();
    try {
      await sayText(E2E_LONG_QUESTION);
      await expectVoiceState(pl.conversation.voiceState.speaking);
      await element(by.id('e2e.say-stop')).tap();
      await expectVoiceState(pl.conversation.voiceState.listening);
      await waitFor(element(by.text(pl.conversation.interrupted)))
        .toExist()
        .withTimeout(TIMEOUT);
      await element(by.id('conversation.mic')).tap();
    } finally {
      await device.enableSynchronization();
    }
    await expect(element(by.text(E2E_LONG_QUESTION))).toExist();

    await element(by.id('conversation.open-summary')).tap();
    await waitFor(element(by.id('summary.empty')))
      .toBeVisible()
      .withTimeout(TIMEOUT);
    await element(by.text(note.name)).tap();
    await element(by.id('summary.generate')).tap();
    // The question and the interrupted answer: the summary covers both.
    await waitFor(element(by.id('summary.content')))
      .toHaveText(`${E2E_SUMMARY_PREFIX}. Forma: ${note.instruction} Wiadomości: 2.`)
      .withTimeout(TIMEOUT);

    await goBack();
    await goBack();
    await waitForTopicList();
  });
});
