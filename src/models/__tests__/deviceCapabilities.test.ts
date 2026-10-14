import { catalogEntry, MODEL_CATALOG, type CatalogEntry } from '../catalog';
import { isNotRecommended } from '../deviceCapabilities';

const GB = 1_000_000_000;

function entry(id: string): CatalogEntry {
  const found = catalogEntry(id);
  if (found === undefined) throw new Error(`missing ${id}`);
  return found;
}

describe('isNotRecommended', () => {
  const llms = MODEL_CATALOG.filter((model) => model.kind === 'llm');
  const big = llms.filter((model) => model.kind === 'llm' && model.parameterBillions >= 3);
  const small = llms.filter((model) => model.kind === 'llm' && model.parameterBillions < 3);

  it.each([
    ['3 GB phone', 3 * GB, { big: true, small: true }],
    ['"4 GB" phone reporting 3.7 GB', 3.7 * GB, { big: true, small: false }],
    ['"6 GB" phone reporting 5.6 GB', 5.6 * GB, { big: false, small: false }],
    ['8 GB phone', 8 * GB, { big: false, small: false }],
  ])('on a %s flags 3B models: %p', (_, memory, expected) => {
    expect(big.length).toBeGreaterThan(0);
    expect(small.length).toBeGreaterThan(0);
    for (const model of big) expect(isNotRecommended(model, memory)).toBe(expected.big);
    for (const model of small) expect(isNotRecommended(model, memory)).toBe(expected.small);
  });

  it('never flags speech models and voices, whatever the memory', () => {
    for (const model of MODEL_CATALOG.filter((candidate) => candidate.kind !== 'llm')) {
      expect(isNotRecommended(model, 1 * GB)).toBe(false);
    }
  });

  it('does not warn when the platform does not report the memory', () => {
    expect(isNotRecommended(entry('qwen2.5-3b'), null)).toBe(false);
  });
});
