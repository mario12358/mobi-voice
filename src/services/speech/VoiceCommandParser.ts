import { normalizeWord } from './KeywordMatcher';

// Topic commands said instead of a question (MV-CMD-1). Recognized on the transcript, before the model.
export type VoiceCommand =
  | { type: 'switch'; name: string }
  | { type: 'create'; name: string }
  | { type: 'list' }
  | { type: 'summarize' };

// Command openings as normalized words; the topic name is what follows them.
const SWITCH_OPENINGS = [
  ['przelacz', 'sie', 'na', 'temat'],
  ['przelacz', 'na', 'temat'],
  ['przelacz', 'na'],
  ['przejdz', 'do', 'tematu'],
  ['przejdz', 'na', 'temat'],
  ['przejdz', 'do'],
  ['otworz', 'temat'],
  ['wroc', 'do', 'tematu'],
  ['zmien', 'temat', 'na'],
];

const CREATE_OPENINGS = [
  ['zacznij', 'nowy', 'temat', 'o'],
  ['zacznij', 'nowy', 'temat'],
  ['nowy', 'temat', 'o'],
  ['nowy', 'temat'],
  ['utworz', 'nowy', 'temat'],
  ['utworz', 'temat'],
  ['zaloz', 'nowy', 'temat'],
  ['zaloz', 'temat'],
];

const LIST_PHRASES = [
  'jakie mam tematy',
  'jakie sa moje tematy',
  'pokaz tematy',
  'pokaz moje tematy',
  'lista tematow',
  'wymien tematy',
  'jakie tematy mam',
];

const SUMMARIZE_PHRASES = ['podsumuj rozmowe', 'podsumuj temat', 'zrob podsumowanie', 'podsumuj to'];

function words(text: string): { original: string[]; normalized: string[] } {
  const original = text
    .trim()
    .split(/\s+/)
    .filter((word) => normalizeWord(word).length > 0);
  return { original, normalized: original.map(normalizeWord) };
}

function startsWith(normalized: string[], opening: string[]): boolean {
  return opening.every((word, index) => normalized[index] === word);
}

// The name as said, without the punctuation around it: "Remont kuchni." → "Remont kuchni".
function nameAfter(original: string[], count: number): string {
  return original
    .slice(count)
    .join(' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export function parseVoiceCommand(transcript: string): VoiceCommand | null {
  const { original, normalized } = words(transcript);
  const phrase = normalized.join(' ');
  if (LIST_PHRASES.includes(phrase)) return { type: 'list' };
  if (SUMMARIZE_PHRASES.includes(phrase)) return { type: 'summarize' };
  for (const opening of CREATE_OPENINGS) {
    if (startsWith(normalized, opening) && normalized.length > opening.length) {
      return { type: 'create', name: nameAfter(original, opening.length) };
    }
  }
  for (const opening of SWITCH_OPENINGS) {
    if (startsWith(normalized, opening) && normalized.length > opening.length) {
      return { type: 'switch', name: nameAfter(original, opening.length) };
    }
  }
  return null;
}

function normalizedPhrase(text: string): string {
  return words(text).normalized.join(' ');
}

function bigrams(text: string): string[] {
  const compact = ` ${text} `;
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
}

// Dice coefficient on letter pairs: tolerant to endings ("wakacji" ~ "wakacje") and small slips.
function similarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  const pool = [...right];
  let shared = 0;
  for (const pair of left) {
    const index = pool.indexOf(pair);
    if (index !== -1) {
      shared += 1;
      pool.splice(index, 1);
    }
  }
  return (2 * shared) / (left.length + right.length);
}

function topicScore(name: string, title: string): number {
  const said = normalizedPhrase(name);
  const known = normalizedPhrase(title);
  if (said === known) return 1;
  // "wakacje" names "Wakacje 2026": every word said appears at the start of a title word.
  const titleWords = known.split(' ');
  const contained = said
    .split(' ')
    .every((word) => titleWords.some((candidate) => candidate.startsWith(word)));
  return contained ? 0.9 : similarity(said, known);
}

const MATCH_THRESHOLD = 0.5;
const AMBIGUITY_MARGIN = 0.05;

export type TopicMatch<T> =
  { kind: 'found'; topic: T } | { kind: 'ambiguous'; topics: T[] } | { kind: 'none' };

// The topic whose title best fits the spoken name; two near-equal fits make it ambiguous.
export function matchTopic<T extends { title: string }>(name: string, topics: T[]): TopicMatch<T> {
  const scored = topics
    .map((topic) => ({ topic, score: topicScore(name, topic.title) }))
    .filter(({ score }) => score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  const [best] = scored;
  if (best === undefined) return { kind: 'none' };
  const close = scored.filter(({ score }) => best.score - score <= AMBIGUITY_MARGIN);
  if (close.length > 1) return { kind: 'ambiguous', topics: close.map(({ topic }) => topic) };
  return { kind: 'found', topic: best.topic };
}
