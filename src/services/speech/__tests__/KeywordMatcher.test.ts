import { matchEndWord, normalizeWord } from '../KeywordMatcher';

describe('matchEndWord', () => {
  // specky: crit 01M4TPSC2XEXCWD5H24XGWKY9M
  it.each([
    'Stop na żądanie przy szkole',
    'stop jest przy wjeździe, a potem rondo',
    'Ile kosztuje autostop',
    'Pojedziemy autostopem',
    'Nie mów stop za wcześnie.',
  ])('does not end the turn when "stop" is not the last word: %p', (transcript) => {
    expect(matchEndWord(transcript)).toEqual({ ended: false, text: transcript });
  });

  // specky: crit 01M4TPSC2X3N2VSTTSH6ZVT7FM
  it.each([
    ['To wszystko, stop.', 'To wszystko'],
    ['to wszystko STOP', 'to wszystko'],
    ['To wszystko Stopp', 'To wszystko'],
    ['To wszystko - Stop!', 'To wszystko'],
    ['To wszystko… stop?', 'To wszystko…'],
    ['Jaka będzie pogoda jutro? Stop', 'Jaka będzie pogoda jutro?'],
    ['Opowiedz o Mazurach, stob.', 'Opowiedz o Mazurach'],
    ['„Stop”', ''],
  ])('ends the turn on %p and sends %p', (transcript, text) => {
    expect(matchEndWord(transcript)).toEqual({ ended: true, text });
  });

  it('treats an empty transcript as an unfinished turn', () => {
    expect(matchEndWord('  ')).toEqual({ ended: false, text: '' });
  });
});

describe('normalizeWord', () => {
  it('folds case, Polish letters and punctuation', () => {
    expect(normalizeWord('STOP,')).toBe('stop');
    expect(normalizeWord('ODBIÓR,')).toBe('odbior');
    expect(normalizeWord('Łódź.')).toBe('lodz');
    expect(normalizeWord('„Zażółć”')).toBe('zazolc');
  });
});
