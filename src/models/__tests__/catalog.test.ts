import { catalogEntry, downloadSizeBytes, llmEntries, MODEL_CATALOG, type CatalogEntry } from '../catalog';
import { validateCatalog } from '../validateCatalog';

describe('model catalog', () => {
  it('passes validation: unique ids, SHA-256, sizes, https download host, safe paths, known dependencies', () => {
    expect(validateCatalog(MODEL_CATALOG)).toEqual([]);
  });

  // specky: crit 01M4TPSCNMTHEHN090MN55X0HD
  it('lists exactly the five local LLM variants from the spec, all GGUF Q4_K_M', () => {
    const models = llmEntries();
    expect(models.map((model) => model.displayName)).toEqual([
      'Qwen 2.5 1.5B',
      'Qwen 2.5 3B',
      'Llama 3.2 1B',
      'Llama 3.2 3B',
      'Gemma 2 2B',
    ]);
    for (const model of models) {
      expect(model.files).toHaveLength(1);
      expect(model.files[0]?.url).toMatch(/q4_k_m\.gguf$/i);
    }
  });

  it('offers the two Polish Piper voices and both whisper variants', () => {
    const voices = MODEL_CATALOG.filter((entry) => entry.kind === 'tts');
    expect(voices.map((entry) => entry.kind === 'tts' && entry.voice).sort()).toEqual(['darkman', 'gosia']);
    const stt = MODEL_CATALOG.filter((entry) => entry.kind === 'stt');
    expect(stt.map((entry) => entry.kind === 'stt' && entry.variant).sort()).toEqual(['base', 'small']);
  });

  it('takes Llama 3.2 from a mirror that needs no Hugging Face licence gate token', () => {
    for (const model of llmEntries().filter((entry) => entry.family === 'llama3.2')) {
      expect(model.files[0]?.url).not.toMatch(/huggingface\.co\/meta-llama\//);
    }
  });

  it('marks 3B models as needing 6 GB RAM and smaller ones 4 GB', () => {
    expect(llmEntries().map((model) => [model.id, model.minRamGb])).toEqual([
      ['qwen2.5-1.5b', 4],
      ['qwen2.5-3b', 6],
      ['llama3.2-1b', 4],
      ['llama3.2-3b', 6],
      ['gemma2-2b', 4],
    ]);
  });

  it('counts the shared pronunciation data into a voice download once', () => {
    const espeak = downloadSizeBytes('espeak-ng-data-pl');
    expect(espeak).toBe(724_102);
    expect(downloadSizeBytes('piper-pl_PL-gosia-medium')).toBe(63_201_421 + 907 + espeak);
    expect(catalogEntry('nope')).toBeUndefined();
  });
});

describe('validateCatalog', () => {
  const file = {
    url: 'https://huggingface.co/a/b/resolve/main/f.bin',
    path: 'f.bin',
    sizeBytes: 10,
    sha256: 'a'.repeat(64),
  };
  const valid: CatalogEntry = {
    id: 'x',
    kind: 'asset',
    displayName: 'X',
    license: { name: 'MIT', url: 'https://huggingface.co/x' },
    requires: [],
    files: [file],
  };

  it.each<[string, CatalogEntry[], RegExp]>([
    ['duplicate id', [valid, valid], /duplicate id x/],
    ['bad hash', [{ ...valid, files: [{ ...file, sha256: 'ABC' }] }], /bad sha256/],
    [
      'http or foreign host',
      [{ ...valid, files: [{ ...file, url: 'http://example.com/f.bin' }] }],
      /disallowed URL/,
    ],
    ['path escaping the model dir', [{ ...valid, files: [{ ...file, path: '../f.bin' }] }], /unsafe path/],
    ['unknown dependency', [{ ...valid, requires: ['ghost'] }], /requires unknown ghost/],
    ['zero size', [{ ...valid, files: [{ ...file, sizeBytes: 0 }] }], /bad size/],
  ])('reports %s', (_, entries, problem) => {
    expect(validateCatalog(entries).join('\n')).toMatch(problem);
  });
});
