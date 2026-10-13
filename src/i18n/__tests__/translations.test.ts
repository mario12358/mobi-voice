import { listSourceFiles, readSource } from '../../core/__tests__/sourceScan';

// Text placed directly between JSX tags on one line, e.g. <Text>Zapisz</Text>; code fragments (; = ? ( ) are not text.
const JSX_TEXT = />[ \t]*([^<>{}\s;=?()][^<>{}\n;=?()]*?)[ \t]*</g;
// String literals passed to props that end up visible or announced to the user.
const TEXT_PROP = /\b(title|label|placeholder|accessibilityLabel|accessibilityHint)=["']([^"']+)["']/g;

function hardcodedTexts(source: string): string[] {
  const jsxTexts = [...source.matchAll(JSX_TEXT)]
    .map((match) => match[1] ?? '')
    .filter((text) => /\p{L}/u.test(text) && !/^[\w.]+$/.test(text) && !text.includes('=>'));
  const propTexts = [...source.matchAll(TEXT_PROP)].map((match) => match[2] ?? '');
  return [...jsxTexts, ...propTexts];
}

describe('translations', () => {
  it('detects hardcoded UI text in a component', () => {
    const sample =
      '<Text>Zapisz zmiany</Text><TextButton label="Usuń" /><Text>{pl.common.back}</Text>\nconst x = n > 0 ? a : b;\nreturn (<View>';
    expect(hardcodedTexts(sample)).toEqual(['Zapisz zmiany', 'Usuń']);
  });

  // specky: crit 01M4TPSDMBK9W28VSKZWA1MT4Y
  it('all UI texts in components come from the Polish translation file', () => {
    const components = listSourceFiles().filter((file) => file.endsWith('.tsx'));
    const offending = components.flatMap((file) =>
      hardcodedTexts(readSource(file)).map((text) => `${file}: ${text}`),
    );
    expect(components.length).toBeGreaterThan(5);
    expect(offending).toEqual([]);
  });
});
