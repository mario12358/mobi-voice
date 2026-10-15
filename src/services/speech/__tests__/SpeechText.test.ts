import { SentenceSplitter, toSpeakable } from '../SpeechText';

// Feeds text as the model streams it: in small pieces that cut words and punctuation apart.
function stream(text: string, pieceLength = 3): { sentences: string[]; doneAt: number[] } {
  const splitter = new SentenceSplitter();
  const sentences: string[] = [];
  const doneAt: number[] = [];
  for (let start = 0; start < text.length; start += pieceLength) {
    for (const sentence of splitter.push(text.slice(start, start + pieceLength))) {
      sentences.push(sentence);
      doneAt.push(Math.min(text.length, start + pieceLength));
    }
  }
  sentences.push(...splitter.flush());
  return { sentences, doneAt };
}

describe('toSpeakable', () => {
  it.each([
    ['**Ważne:** weź _parasol_.', 'Ważne: weź parasol.'],
    ['## Plan dnia\n- rano spacer\n- wieczorem kino', 'Plan dnia rano spacer wieczorem kino'],
    ['1. Mąka\n2) Cukier', 'Mąka Cukier'],
    ['Zobacz [mapę](https://example.com/mapa) i `kod`.', 'Zobacz mapę i kod.'],
    ['> cytat z książki', 'cytat z książki'],
    ['Przykład:\n```js\nconst a = 1;\n```\nKoniec.', 'Przykład: Koniec.'],
    ['| Dzień | Pogoda |\n|---|:---:|\n| pon | słońce |', 'Dzień Pogoda pon słońce'],
    ['~~stare~~ nowe', 'stare nowe'],
  ])('reads %p as %p', (markdown, spoken) => {
    expect(toSpeakable(markdown)).toBe(spoken);
  });

  it('drops emoji, including skin tones, flags and keycaps', () => {
    expect(toSpeakable('Super 👍🏽! Jedziemy 🇵🇱 nad morze 🌊 o 1️⃣ w nocy ❤️')).toBe(
      'Super ! Jedziemy nad morze o 1 w nocy',
    );
  });

  it('keeps Polish letters, numbers and plain punctuation untouched', () => {
    const text = 'Zażółć gęślą jaźń — 3,5 km, godz. 14:30 (około).';
    expect(toSpeakable(text)).toBe(text);
  });
});

describe('SentenceSplitter', () => {
  it('starts the voice after the first words: the first piece ends at a clause break', () => {
    const answer = 'Na weekend polecam Mazury, bo jest tam cicho i pięknie. Weź kurtkę, wieczory są chłodne.';
    const { sentences, doneAt } = stream(answer);

    expect(sentences).toEqual([
      'Na weekend polecam Mazury,',
      'bo jest tam cicho i pięknie.',
      // Later pieces are whole sentences again.
      'Weź kurtkę, wieczory są chłodne.',
    ]);
    expect(doneAt[0]).toBeLessThan(answer.indexOf('cicho'));
  });

  it('cuts a long first sentence without punctuation after ten words', () => {
    const answer =
      'To jest bardzo długie zdanie bez żadnych przecinków które ciągnie się dalej i dalej aż do końca.';
    const { sentences } = stream(answer);

    expect(sentences).toEqual([
      'To jest bardzo długie zdanie bez żadnych przecinków które ciągnie',
      'się dalej i dalej aż do końca.',
    ]);
  });

  it('keeps a short first clause with the rest of its sentence', () => {
    expect(stream('Tak, to dobry pomysł. Jedź.').sentences).toEqual(['Tak, to dobry pomysł.', 'Jedź.']);
  });

  it('hands out the first full sentence before the answer is complete', () => {
    const answer = 'Proponuję Mazury. Jeziora są tam piękne! Czy lubisz żeglować?';
    const { sentences, doneAt } = stream(answer);

    expect(sentences).toEqual(['Proponuję Mazury.', 'Jeziora są tam piękne!', 'Czy lubisz żeglować?']);
    // Known as soon as the next word starts, long before the answer ends.
    expect(doneAt[0]).toBeLessThanOrEqual(answer.indexOf('Jeziora') + 3);
    expect(doneAt[0]).toBeLessThan(answer.length / 2);
  });

  it.each([
    ['abbreviations', 'Weź np. kurtkę, itd. Potem wyjdź.', ['Weź np. kurtkę, itd. Potem wyjdź.']],
    ['abbreviation before a name', 'Umów się z dr. Nowakiem. Jutro.', ['Umów się z dr. Nowakiem.', 'Jutro.']],
    ['m.in.', 'Są tam m.in. Mikołajki. Warto.', ['Są tam m.in. Mikołajki.', 'Warto.']],
    ['decimal numbers', 'Kosztuje 3.5 zł. Tanio.', ['Kosztuje 3.5 zł. Tanio.']],
    ['dates', 'Wyjazd 14.10.2026 rano. Gotowe.', ['Wyjazd 14.10.2026 rano.', 'Gotowe.']],
    [
      'ordinal day before a month',
      'Przyjedź 5. maja wieczorem. Dobrze?',
      ['Przyjedź 5. maja wieczorem.', 'Dobrze?'],
    ],
    ['ellipsis inside a sentence', 'No cóż... może jutro. Tak.', ['No cóż... może jutro.', 'Tak.']],
    ['ellipsis ending a sentence', 'Hmm… Zobaczymy.', ['Hmm…', 'Zobaczymy.']],
    [
      'mixed ?! and quotes',
      'Powiedział: „Jedziemy!” Potem ruszył.',
      ['Powiedział: „Jedziemy!”', 'Potem ruszył.'],
    ],
    [
      'a sentence followed by a number',
      'Mam dwie opcje. 3 dni albo tydzień.',
      ['Mam dwie opcje.', '3 dni albo tydzień.'],
    ],
  ])('handles %s', (_, answer, expected) => {
    expect(stream(answer).sentences).toEqual(expected);
  });

  it('splits list lines into separate pieces without bullets', () => {
    expect(stream('Weź:\n- krem\n- czapkę\nI tyle.').sentences).toEqual([
      'Weź:',
      'krem',
      'czapkę',
      'I tyle.',
    ]);
  });

  it('does not cut inside an unfinished code block', () => {
    expect(stream('Kod:\n```\na = 1\n\nb = 2\n```\nGotowe.').sentences).toEqual(['Kod:', 'Gotowe.']);
  });

  it('skips pieces that are only emoji or Markdown', () => {
    expect(stream('Jasne! 👍\n---\nZaczynamy.').sentences).toEqual(['Jasne!', 'Zaczynamy.']);
  });

  it('gives the unfinished rest on flush and starts clean after reset', () => {
    const splitter = new SentenceSplitter();
    expect(splitter.push('Bez kropki na końcu')).toEqual([]);
    expect(splitter.flush()).toEqual(['Bez kropki na końcu']);

    splitter.push('Porzucone zdanie');
    splitter.reset();
    expect(splitter.flush()).toEqual([]);
  });
});
