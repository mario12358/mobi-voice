// Text for the ear: the chat keeps the model's answer as written, TTS gets it without Markdown and emoji
// (MV-CHAT-1), cut into whole sentences so reading can start before the answer is complete.

const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}]/gu;

// Polish abbreviations that end with a dot but do not end a sentence.
const ABBREVIATIONS = new Set([
  'np',
  'itd',
  'itp',
  'tzn',
  'tj',
  'tzw',
  'ok',
  'ul',
  'al',
  'pl',
  'nr',
  'godz',
  'min',
  'max',
  'dr',
  'prof',
  'mgr',
  'inż',
  'św',
  'r',
  'w',
  'wg',
  'ds',
  'jw',
  'zob',
  'por',
  'ang',
  'łac',
  'm.in',
  'b',
  'ub',
  'tys',
  'mln',
  'mld',
  'zł',
  'gr',
]);

export function toSpeakable(text: string): string {
  return (
    text
      // Fenced code is not read out.
      .replace(/```[\s\S]*?(```|$)/g, ' ')
      // Links and images: keep the visible label.
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`([^`]*)`/g, '$1')
      // Headings, quotes, list bullets and numbering at line start.
      .replace(/^[ \t]*(#{1,6}[ \t]+|>[ \t]?|[-*+•][ \t]+|\d+[.)][ \t]+)/gm, '')
      // Bold, italics, strike-through markers.
      .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
      .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,!?:;]|$)/g, '$1$2')
      // Table separator rows, horizontal rules and table pipes.
      .replace(/^[ \t]*\|?([ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*:?-*:?[ \t]*$/gm, ' ')
      .replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, ' ')
      .replace(/\|/g, ' ')
      .replace(EMOJI, '')
      .replace(/[ \t]*\n+[ \t]*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

function endsWithAbbreviation(text: string): boolean {
  const word = /([\p{L}.]+)\.$/u.exec(text)?.[1];
  return word !== undefined && ABBREVIATIONS.has(word.toLocaleLowerCase('pl'));
}

// A sentence ends at . ! ? or … (with closing quotes/brackets) followed by space and a word that does not
// start lowercase. Not after an abbreviation, nor inside a number (3.5, 14.10.2026) or an ordinal (5. maja).
function findBoundary(text: string, from: number): number | null {
  const pattern = /[.!?…]+["'”»)\]]*(?=\s+(\S))/gu;
  pattern.lastIndex = from;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    const end = match.index + match[0].length;
    const next = match[1] ?? '';
    const head = text.slice(0, end);
    const isDotOnly = /^\.["'”»)\]]*$/.test(match[0]);
    if (next.toLocaleLowerCase('pl') === next && next.toLocaleUpperCase('pl') !== next) continue;
    if (isDotOnly && endsWithAbbreviation(head)) continue;
    if (isDotOnly && /\d\.$/.test(head) && /\d/.test(next)) continue;
    return end;
  }
  return null;
}

// A line break before more text also ends a piece of speech (list items, paragraphs), unless it is inside
// a code block that is still open.
function findLineBreak(text: string): number | null {
  const fences = [...text.matchAll(/```/g)].map((fence) => fence.index);
  const insideCode = (index: number) =>
    fences.some((start, at) => at % 2 === 0 && index > start && index < (fences[at + 1] ?? Infinity));
  for (const match of text.matchAll(/\n\s*\S/g)) {
    if (!insideCode(match.index)) return match.index;
  }
  return null;
}

function nextCut(text: string): number | null {
  const candidates = [findBoundary(text, 0), findLineBreak(text)].filter(
    (cut): cut is number => cut !== null,
  );
  return candidates.length === 0 ? null : Math.min(...candidates);
}

// The first piece of an answer may end early, so the voice starts after the first words, not after the
// whole first sentence: at a clause break once it has a few words, or after a run of words without one.
const FIRST_PIECE_MIN_WORDS = 4;
const FIRST_PIECE_MAX_WORDS = 10;

function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

function firstPieceCut(text: string): number | null {
  if (text.includes('```')) return null;
  for (const match of text.matchAll(/[,;:–—](?=\s+\S)/gu)) {
    const end = match.index + match[0].length;
    if (wordCount(text.slice(0, end)) >= FIRST_PIECE_MIN_WORDS) return end;
  }
  // Words followed by a space are complete; the last one may still be growing.
  const words = [...text.matchAll(/\S+(?=\s)/gu)];
  const last = words[FIRST_PIECE_MAX_WORDS - 1];
  return last === undefined ? null : last.index + last[0].length;
}

// Collects streamed tokens and hands out complete, speakable sentences as soon as they are known.
export class SentenceSplitter {
  private buffer = '';
  private started = false;

  push(token: string): string[] {
    this.buffer += token;
    const sentences: string[] = [];
    const early = this.started ? null : (nextCut(this.buffer) ?? firstPieceCut(this.buffer));
    if (early !== null) {
      this.emit(this.buffer.slice(0, early), sentences);
      this.buffer = this.buffer.slice(early).trimStart();
    }
    for (let end = nextCut(this.buffer); end !== null; end = nextCut(this.buffer)) {
      this.emit(this.buffer.slice(0, end), sentences);
      this.buffer = this.buffer.slice(end).trimStart();
    }
    return sentences;
  }

  // End of the answer: whatever is left is the last sentence.
  flush(): string[] {
    const sentences: string[] = [];
    this.emit(this.buffer, sentences);
    this.buffer = '';
    return sentences;
  }

  reset(): void {
    this.buffer = '';
    this.started = false;
  }

  private emit(raw: string, into: string[]): void {
    const speakable = toSpeakable(raw);
    // Nothing left to say once Markdown and emoji are gone (e.g. a lone "👍").
    if (/[\p{L}\p{N}]/u.test(speakable)) {
      into.push(speakable);
      this.started = true;
    }
  }
}
