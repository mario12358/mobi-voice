import { matchEndWord, normalizeWord } from '../KeywordMatcher';

describe('matchEndWord', () => {
  // specky: crit 01M4TPSC2XEXCWD5H24XGWKY9M
  it.each([
    'Odbiór paczki jutro',
    'odbiór jest w środę, a potem wyjazd',
    'Gdzie jest punkt odbioru paczek',
    'Gdzie jest najbliższy punkt odbioru',
    'Nie mów odbiór za wcześnie.',
  ])('does not end the turn when "odbiór" is not the last word: %p', (transcript) => {
    expect(matchEndWord(transcript)).toEqual({ ended: false, text: transcript });
  });

  // specky: crit 01M4TPSC2X3N2VSTTSH6ZVT7FM
  it.each([
    ['To wszystko, odbiór.', 'To wszystko'],
    ['to wszystko ODBIÓR', 'to wszystko'],
    ['To wszystko odbior', 'To wszystko'],
    ['To wszystko - Odbiór!', 'To wszystko'],
    ['To wszystko… odbiór?', 'To wszystko…'],
    ['Jaka będzie pogoda jutro? Odbiór', 'Jaka będzie pogoda jutro?'],
    ['Opowiedz o Mazurach, odbiur.', 'Opowiedz o Mazurach'],
    ['„Odbiór”', ''],
  ])('ends the turn on %p and sends %p', (transcript, text) => {
    expect(matchEndWord(transcript)).toEqual({ ended: true, text });
  });

  it('treats an empty transcript as an unfinished turn', () => {
    expect(matchEndWord('  ')).toEqual({ ended: false, text: '' });
  });
});

describe('normalizeWord', () => {
  it('folds case, Polish letters and punctuation', () => {
    expect(normalizeWord('ODBIÓR,')).toBe('odbior');
    expect(normalizeWord('Łódź.')).toBe('lodz');
    expect(normalizeWord('„Zażółć”')).toBe('zazolc');
  });
});
