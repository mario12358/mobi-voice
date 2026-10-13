import type { TtsVoice, WhisperVariant } from '../state/settings';

// Display names are proper names only; UI labels around them come from src/i18n/pl.ts.
// Curated, closed list of downloadable models (MV-MOD-1, Q11). Sizes and SHA-256 come from the
// Hugging Face file metadata (LFS oid) or were computed from the downloaded file (small non-LFS files).
// Every URL is a `resolve/main` link on huggingface.co, the only allowed download host (networkPolicy).

export interface ModelFile {
  url: string;
  // Destination relative to the model's own directory on the device.
  path: string;
  sizeBytes: number;
  sha256: string;
}

export interface License {
  name: string;
  url: string;
}

interface CatalogEntryBase {
  id: string;
  displayName: string;
  files: ModelFile[];
  license: License;
  // Other catalog entries that must be downloaded together with this one.
  requires: string[];
}

export interface LlmEntry extends CatalogEntryBase {
  kind: 'llm';
  family: 'qwen2.5' | 'llama3.2' | 'gemma2';
  parameterBillions: number;
  minRamGb: number;
  contextTokens: number;
  maxOutputTokens: number;
}

export interface SttEntry extends CatalogEntryBase {
  kind: 'stt';
  variant: WhisperVariant;
}

export interface TtsEntry extends CatalogEntryBase {
  kind: 'tts';
  voice: TtsVoice;
  sampleRate: number;
}

export interface AssetEntry extends CatalogEntryBase {
  kind: 'asset';
}

export type CatalogEntry = LlmEntry | SttEntry | TtsEntry | AssetEntry;

const HF = 'https://huggingface.co';

function hfFile(repo: string, file: string, sizeBytes: number, sha256: string, path = file): ModelFile {
  return { url: `${HF}/${repo}/resolve/main/${file}`, path, sizeBytes, sha256 };
}

const LICENSES = {
  apache2: {
    name: 'Apache License 2.0 (Qwen 2.5)',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct/blob/main/LICENSE',
  },
  llama32: {
    name: 'Llama 3.2 Community License',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/blob/main/LICENSE',
  },
  gemma: { name: 'Gemma Terms of Use', url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF' },
  whisper: { name: 'MIT (Whisper, whisper.cpp)', url: 'https://huggingface.co/ggerganov/whisper.cpp' },
  piper: {
    name: 'MIT (Piper voices; CC0 recordings, fine-tuned from lessac)',
    url: 'https://huggingface.co/rhasspy/piper-voices',
  },
  espeak: {
    name: 'GPL-3.0-or-later (eSpeak NG)',
    url: 'https://huggingface.co/csukuangfj/vits-piper-pl_PL-gosia-medium',
  },
} satisfies Record<string, License>;

const ESPEAK_REPO = 'csukuangfj/vits-piper-pl_PL-gosia-medium';
const ESPEAK_PL_FILES: [string, number, string][] = [
  ['espeak-ng-data/phontab', 55_796, '886f3fa402cb0ba73d483aa8ad000af47a6b7cc06293c75a97913fba68a530f6'],
  ['espeak-ng-data/phonindex', 39_074, '3ca7b8fa3b42624e4b0f152707e7a39245fce569aa99ea47c055d9e622fcf0c4'],
  ['espeak-ng-data/phondata', 550_424, '4e0288957874029a8c3c9f41a8f517ad4bf18127046decbdd4b9d1d6807ce3a3'],
  ['espeak-ng-data/intonations', 2_040, '3f8af65fd3eda9759a10f021d61361c120871f463515229c925995c7f90918cc'],
  ['espeak-ng-data/pl_dict', 76_730, '0e0ce6cfe4eba41a1223362a046390dca359a3e597af8243adaac84d624ef18f'],
  ['espeak-ng-data/lang/zlw/pl', 38, '83c586a2b724b24b9f98d21ade5022112c465ac446ca09930286980ceae1c781'],
];
const PIPER_TOKENS_SHA256 = '2619c1a9de1bcf928162f40c583caf39368cfd6b2340c7bcad51dc634411ec36';

function llm(
  entry: Omit<LlmEntry, 'kind' | 'requires' | 'contextTokens' | 'maxOutputTokens' | 'files'>,
  repo: string,
  file: string,
  sizeBytes: number,
  sha256: string,
): LlmEntry {
  // 4k context keeps the KV cache within phone memory budgets (S1, MV-CHAT-2).
  return {
    ...entry,
    kind: 'llm',
    requires: [],
    contextTokens: 4_096,
    maxOutputTokens: 512,
    files: [hfFile(repo, file, sizeBytes, sha256, 'model.gguf')],
  };
}

function piperVoice(voice: TtsVoice, sha256: string): TtsEntry {
  const repo = `csukuangfj/vits-piper-pl_PL-${voice}-medium`;
  return {
    id: `piper-pl_PL-${voice}-medium`,
    kind: 'tts',
    voice,
    displayName: voice === 'gosia' ? 'Gosia' : 'Darkman',
    sampleRate: 22_050,
    license: LICENSES.piper,
    requires: ['espeak-ng-data-pl'],
    files: [
      hfFile(repo, `pl_PL-${voice}-medium.onnx`, 63_201_421, sha256, 'model.onnx'),
      hfFile(repo, 'tokens.txt', 907, PIPER_TOKENS_SHA256),
    ],
  };
}

export const MODEL_CATALOG: readonly CatalogEntry[] = [
  llm(
    {
      id: 'qwen2.5-1.5b',
      displayName: 'Qwen 2.5 1.5B',
      family: 'qwen2.5',
      parameterBillions: 1.5,
      minRamGb: 4,
      license: LICENSES.apache2,
    },
    'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    1_117_320_736,
    '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
  ),
  llm(
    {
      id: 'qwen2.5-3b',
      displayName: 'Qwen 2.5 3B',
      family: 'qwen2.5',
      parameterBillions: 3,
      minRamGb: 6,
      license: LICENSES.apache2,
    },
    'Qwen/Qwen2.5-3B-Instruct-GGUF',
    'qwen2.5-3b-instruct-q4_k_m.gguf',
    2_104_932_768,
    '626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d',
  ),
  llm(
    {
      id: 'llama3.2-1b',
      displayName: 'Llama 3.2 1B',
      family: 'llama3.2',
      parameterBillions: 1,
      minRamGb: 4,
      license: LICENSES.llama32,
    },
    'bartowski/Llama-3.2-1B-Instruct-GGUF',
    'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    807_694_464,
    '6f85a640a97cf2bf5b8e764087b1e83da0fdb51d7c9fab7d0fece9385611df83',
  ),
  llm(
    {
      id: 'llama3.2-3b',
      displayName: 'Llama 3.2 3B',
      family: 'llama3.2',
      parameterBillions: 3,
      minRamGb: 6,
      license: LICENSES.llama32,
    },
    'bartowski/Llama-3.2-3B-Instruct-GGUF',
    'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    2_019_377_696,
    '6c1a2b41161032677be168d354123594c0e6e67d2b9227c84f296ad037c728ff',
  ),
  llm(
    {
      id: 'gemma2-2b',
      displayName: 'Gemma 2 2B',
      family: 'gemma2',
      parameterBillions: 2,
      minRamGb: 4,
      license: LICENSES.gemma,
    },
    'bartowski/gemma-2-2b-it-GGUF',
    'gemma-2-2b-it-Q4_K_M.gguf',
    1_708_582_752,
    'e0aee85060f168f0f2d8473d7ea41ce2f3230c1bc1374847505ea599288a7787',
  ),
  {
    id: 'whisper-small',
    kind: 'stt',
    variant: 'small',
    displayName: 'Whisper small',
    license: LICENSES.whisper,
    requires: [],
    files: [
      hfFile(
        'ggerganov/whisper.cpp',
        'ggml-small.bin',
        487_601_967,
        '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
        'model.bin',
      ),
    ],
  },
  {
    id: 'whisper-base',
    kind: 'stt',
    variant: 'base',
    displayName: 'Whisper base',
    license: LICENSES.whisper,
    requires: [],
    files: [
      hfFile(
        'ggerganov/whisper.cpp',
        'ggml-base.bin',
        147_951_465,
        '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
        'model.bin',
      ),
    ],
  },
  piperVoice('darkman', 'fe8df9888ce02d985472355b3cad5fa2267c8bffa7c09438029bb16d07060adc'),
  piperVoice('gosia', '6e02e04a26ff2a96fe5780dad58df0d5249177ba96a6bbe1fe2ba5a6714d17e4'),
  {
    // Polish subset of eSpeak NG data used by Piper/sherpa-onnx for phonemization; shared by both voices.
    id: 'espeak-ng-data-pl',
    kind: 'asset',
    displayName: 'eSpeak NG (pl)',
    license: LICENSES.espeak,
    requires: [],
    files: ESPEAK_PL_FILES.map(([file, sizeBytes, sha256]) => hfFile(ESPEAK_REPO, file, sizeBytes, sha256)),
  },
];

export function catalogEntry(id: string): CatalogEntry | undefined {
  return MODEL_CATALOG.find((entry) => entry.id === id);
}

export function llmEntries(): LlmEntry[] {
  return MODEL_CATALOG.filter((entry): entry is LlmEntry => entry.kind === 'llm');
}

// Bytes to download for an entry including the entries it requires (each counted once).
export function downloadSizeBytes(id: string, seen = new Set<string>()): number {
  const entry = catalogEntry(id);
  if (entry === undefined || seen.has(id)) return 0;
  seen.add(id);
  const own = entry.files.reduce((total, file) => total + file.sizeBytes, 0);
  return own + entry.requires.reduce((total, required) => total + downloadSizeBytes(required, seen), 0);
}
