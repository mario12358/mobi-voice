// The end-of-turn word of the interrupted mode (MV-VOICE-2): "stop", the same word that interrupts the
// assistant. Whisper writes it in any case, glued to punctuation, sometimes doubled or misheard.
const END_WORD_VARIANTS = new Set(['stop', 'stopp', 'stob', 'stopu']);

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

// Only the last word counts: "stop na żądanie przy szkole" is an ordinary sentence, "to wszystko, stop." ends it.
export function matchEndWord(transcript: string): EndWordMatch {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((word) => normalizeWord(word).length > 0);
  const last = words.at(-1);
  if (last === undefined || !isEndWord(last)) return { ended: false, text: transcript.trim() };

  const rest = transcript.trim().slice(0, transcript.trim().lastIndexOf(last));
  // Drop the pause punctuation left before the word ("to wszystko, stop" → "to wszystko").
  return { ended: true, text: rest.replace(/[\s,;:–—-]+$/u, '').trim() };
}
