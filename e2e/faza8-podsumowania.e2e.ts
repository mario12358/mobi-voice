import { by, device, element, expect, waitFor } from 'detox';

import { BUILTIN_TEMPLATES } from '../src/db/repositories/SummaryTemplateRepository';
import { E2E_SUMMARIZE } from '../src/e2e/testHooks';
import { E2E_SUMMARY_PREFIX, E2E_TOPIC_TITLE } from '../src/engines/fakes/FakeLlmEngine';
import { pl } from '../src/i18n/pl';
import { goBack } from './helpers/device';
import { sayText } from './helpers/voice';

const TIMEOUT = 20000;
const OWN_INSTRUCTION = 'Dwa zdania dla rodziny.';
const OWN_TEMPLATE = 'Dla rodziny';
const tasks = BUILTIN_TEMPLATES.find((template) => template.name === 'Lista zadań')!;
const summaryText = (instruction: string, messages: number) =>
  `${E2E_SUMMARY_PREFIX}. Forma: ${instruction} Wiadomości: ${messages}.`;

// Scrolls from the middle of the screen: a swipe from the bottom edge is Android's "go home".
async function reveal(id: string) {
  await waitFor(element(by.id(id)))
    .toBeVisible()
    .whileElement(by.id('summary.scroll'))
    .scroll(200, 'down', NaN, 0.5);
}

async function expectSummary(text: string) {
  await waitFor(element(by.id('summary.content')))
    .toHaveText(text)
    .withTimeout(TIMEOUT);
}

async function expectShared(count: number, firstLine: string) {
  await waitFor(element(by.id('e2e.shared')))
    .toHaveText(pl.common.e2eShared(count, firstLine))
    .withTimeout(TIMEOUT);
}

async function expectSpoken(sentence: string) {
  await waitFor(element(by.id('e2e.spoken')))
    .toHaveText(pl.common.e2eSpoken(sentence))
    .withTimeout(TIMEOUT);
}

async function expectVoiceState(label: string) {
  await waitFor(element(by.id('conversation.voice-state')))
    .toHaveText(label)
    .withTimeout(TIMEOUT);
}

describe('Faza 8: podsumowania i eksport', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await waitFor(element(by.id('topic-list-screen')))
      .toBeVisible()
      .withTimeout(30000);
    await element(by.id('topic-list.new-topic')).tap();
    await element(by.id('conversation.input')).replaceText('Planujemy remont kuchni');
    await element(by.id('conversation.send')).tap();
    // The first exchange names the topic; the export and the share carry that title.
    await waitFor(element(by.text(E2E_TOPIC_TITLE)))
      .toExist()
      .withTimeout(TIMEOUT);
  });

  it('summarizes with a built-in template and with an own instruction kept as a template', async () => {
    await element(by.id('conversation.open-summary')).tap();
    await waitFor(element(by.id('summary.empty')))
      .toBeVisible()
      .withTimeout(TIMEOUT);

    await element(by.text(tasks.name)).tap();
    await element(by.id('summary.generate')).tap();
    await expectSummary(summaryText(tasks.instruction, 2));

    await element(by.id('summary.template-custom')).tap();
    await element(by.id('summary.custom-instruction')).replaceText(OWN_INSTRUCTION);
    await reveal('summary.generate');
    await element(by.id('summary.generate')).tap();
    await expectSummary(summaryText(OWN_INSTRUCTION, 2));

    await element(by.id('summary.template-name')).replaceText(OWN_TEMPLATE);
    await reveal('summary.save-template');
    await element(by.id('summary.save-template')).tap();
    await waitFor(element(by.text(OWN_TEMPLATE)))
      .toExist()
      .withTimeout(TIMEOUT);
    await expect(element(by.id('summary.content'))).toHaveText(summaryText(OWN_INSTRUCTION, 2));
  });

  it('regenerates, copies, shares as Markdown and reads the summary aloud', async () => {
    await reveal('summary.generate');
    // testIDs sit on the pressable, the label is its text child.
    await expect(element(by.text(pl.summary.regenerate))).toBeVisible();
    await element(by.id('summary.generate')).tap();
    await expectSummary(summaryText(OWN_INSTRUCTION, 2));

    await reveal('summary.copy');
    await element(by.id('summary.copy')).tap();
    await expect(element(by.id('summary.copied'))).toHaveText(pl.summary.copied);

    await element(by.id('summary.share')).tap();
    await expectShared(1, `# ${E2E_TOPIC_TITLE}`);

    await element(by.id('summary.listen')).tap();
    await waitFor(element(by.text(pl.summary.listen)))
      .toBeVisible()
      .withTimeout(TIMEOUT);
  });

  it('"podsumuj rozmowę" said in a voice session summarizes the whole topic in the form used last', async () => {
    await goBack();
    await element(by.id('conversation.mic')).tap();
    await expectVoiceState(pl.conversation.voiceState.listening);
    await device.disableSynchronization();
    try {
      // One more exchange by voice, so the new summary covers four messages.
      await element(by.id('e2e.speak')).tap();
      await expectSpoken('To jest drugie zdanie.');
      await expectVoiceState(pl.conversation.voiceState.listening);
      await sayText(E2E_SUMMARIZE);
      // The summary is read sentence by sentence; its last one names the messages it covered.
      await expectSpoken('Wiadomości: 4.');
      await expectVoiceState(pl.conversation.voiceState.listening);
      await element(by.id('conversation.mic')).tap();
    } finally {
      await device.enableSynchronization();
    }

    await element(by.id('conversation.open-summary')).tap();
    await expectSummary(summaryText(OWN_INSTRUCTION, 4));
    await expect(element(by.text(OWN_TEMPLATE))).toExist();
    await goBack();
  });

  it('exports the topic history from the conversation and from the topic list', async () => {
    await element(by.id('conversation.export')).tap();
    await expectShared(2, `# ${E2E_TOPIC_TITLE}`);

    await goBack();
    await element(by.label(pl.topicExport.actionLabel(E2E_TOPIC_TITLE))).tap();
    await expectShared(3, `# ${E2E_TOPIC_TITLE}`);
    await expect(element(by.id('topic-list-screen'))).toBeVisible();
  });
});
