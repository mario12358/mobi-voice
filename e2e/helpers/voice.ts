import { by, element } from 'detox';

// The fake STT "hears" this sentence in the next injected utterance (e2e builds only).
export async function sayText(sentence: string): Promise<void> {
  await element(by.id('e2e.utterance')).replaceText(sentence);
  await element(by.id('e2e.say-text')).tap();
  // The field would otherwise still show the sentence, which tests look for in the conversation.
  await element(by.id('e2e.utterance')).clearText();
}
