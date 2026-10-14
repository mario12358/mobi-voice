import { matchTopic, parseVoiceCommand } from '../VoiceCommandParser';

const TOPICS = [
  { id: 1, title: 'Wakacje 2026' },
  { id: 2, title: 'Remont kuchni' },
  { id: 3, title: 'Zakupy na weekend' },
  { id: 4, title: 'Zakupy świąteczne' },
  { id: 5, title: 'Nauka hiszpańskiego' },
];

describe('parseVoiceCommand', () => {
  it.each([
    ['Przełącz na temat wakacje', { type: 'switch', name: 'wakacje' }],
    ['przełącz się na temat Remont kuchni.', { type: 'switch', name: 'Remont kuchni' }],
    ['Przejdź do tematu nauka hiszpańskiego', { type: 'switch', name: 'nauka hiszpańskiego' }],
    ['Otwórz temat zakupy', { type: 'switch', name: 'zakupy' }],
    ['PRZELACZ NA wakacje!', { type: 'switch', name: 'wakacje' }],
    ['Nowy temat remont łazienki', { type: 'create', name: 'remont łazienki' }],
    ['Zacznij nowy temat o ogrodzie.', { type: 'create', name: 'ogrodzie' }],
    ['utwórz temat Prezenty dla mamy', { type: 'create', name: 'Prezenty dla mamy' }],
    ['Jakie mam tematy?', { type: 'list' }],
    ['pokaż moje tematy', { type: 'list' }],
    ['Lista tematów.', { type: 'list' }],
    ['Podsumuj rozmowę', { type: 'summarize' }],
  ])('recognizes %p', (transcript, command) => {
    expect(parseVoiceCommand(transcript)).toEqual(command);
  });

  // specky: crit 01M4TPSD981M9JE8DH1AAHE29F
  it.each([
    'Gdzie jechać na wakacje?',
    'Jaki temat wybrać na referat?',
    'Przełącz',
    'Nowy temat',
    'Opowiedz o tematach rozmów przy kawie',
    'Pokaż mi przepis na sernik',
  ])('leaves %p to the model as an ordinary question', (transcript) => {
    expect(parseVoiceCommand(transcript)).toBeNull();
  });
});

describe('matchTopic', () => {
  // specky: crit 01M4TPSD985J6R5DR64N3QGXJD
  it('finds the topic with the most similar name', () => {
    expect(matchTopic('wakacje', TOPICS)).toEqual({ kind: 'found', topic: TOPICS[0] });
    expect(matchTopic('remont kuchni', TOPICS)).toEqual({ kind: 'found', topic: TOPICS[1] });
    expect(matchTopic('hiszpański', TOPICS)).toEqual({ kind: 'found', topic: TOPICS[4] });
    expect(matchTopic('wakacji', TOPICS)).toEqual({ kind: 'found', topic: TOPICS[0] });
    // One word of a long title is enough when it opens a word of that title.
    expect(matchTopic('nauka', TOPICS)).toEqual({ kind: 'found', topic: TOPICS[4] });
  });

  it('reports equally good fits as ambiguous', () => {
    expect(matchTopic('zakupy', TOPICS)).toEqual({ kind: 'ambiguous', topics: [TOPICS[2], TOPICS[3]] });
  });

  it('finds nothing for a name unlike any topic', () => {
    expect(matchTopic('samochód', TOPICS)).toEqual({ kind: 'none' });
    expect(matchTopic('cokolwiek', [])).toEqual({ kind: 'none' });
  });
});
