// The end-of-turn word of the interrupted mode (MV-VOICE-2). Whisper writes it in many ways: with or
// without Polish letters, in any case, glued to punctuation, sometimes misheard.
const END_WORD_VARIANTS = new Set(['odbior', 'odbiur', 'odbjor', 'otbior']);

export interface EndWordMatch {
  // True when the utterance ends with the end-of-turn word.
  ended: boolean;
  // The utterance without that word (and its punctuation), ready for the model and the history.
  text: string;
}

export function normalizeWord(word: string): string {
  return word
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function isEndWord(word: string): boolean {
  return END_WORD_VARIANTS.has(normalizeWord(word));
}

// Only the last word counts: "odbiór paczki jutro" is an ordinary sentence, "to wszystko, odbiór." ends it.
export function matchEndWord(transcript: string): EndWordMatch {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((word) => normalizeWord(word).length > 0);
  const last = words.at(-1);
  if (last === undefined || !isEndWord(last)) return { ended: false, text: transcript.trim() };

  const rest = transcript.trim().slice(0, transcript.trim().lastIndexOf(last));
  // Drop the pause punctuation left before the word ("to wszystko, odbiór" → "to wszystko").
  return { ended: true, text: rest.replace(/[\s,;:–—-]+$/u, '').trim() };
}
