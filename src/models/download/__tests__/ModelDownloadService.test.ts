import { DomainError } from '../../../core/errors';
import type { CatalogEntry } from '../../catalog';
import { ModelDownloadService } from '../ModelDownloadService';
import type { ConnectionType, DownloadProgress } from '../types';
import { MemoryModelFileSystem, sha256Of } from './support/memoryModelFileSystem';

const HF = 'https://huggingface.co/test/repo/resolve/main';

function bytes(length: number, seed: number): Uint8Array {
  return Uint8Array.from({ length }, (_, index) => (index * 31 + seed) % 256);
}

const MODEL_BYTES = bytes(1_000, 1);
const VOICE_BYTES = bytes(300, 2);
const TOKENS_BYTES = bytes(20, 3);
const ESPEAK_BYTES = bytes(50, 4);

const license = { name: 'MIT', url: 'https://huggingface.co/test' };
const ESPEAK_FILE = {
  url: `${HF}/phondata`,
  path: 'espeak-ng-data/phondata',
  sizeBytes: 50,
  sha256: sha256Of(ESPEAK_BYTES),
};
const ESPEAK: CatalogEntry = {
  id: 'espeak',
  kind: 'asset',
  displayName: 'eSpeak',
  license,
  requires: [],
  files: [ESPEAK_FILE],
};
const CATALOG: CatalogEntry[] = [
  {
    id: 'llm',
    kind: 'llm',
    displayName: 'LLM',
    family: 'qwen2.5',
    parameterBillions: 1.5,
    minRamGb: 4,
    contextTokens: 4096,
    maxOutputTokens: 512,
    license,
    requires: [],
    files: [{ url: `${HF}/model.gguf`, path: 'model.gguf', sizeBytes: 1_000, sha256: sha256Of(MODEL_BYTES) }],
  },
  {
    id: 'voice',
    kind: 'tts',
    voice: 'gosia',
    sampleRate: 22_050,
    displayName: 'Gosia',
    license,
    requires: ['espeak'],
    files: [
      { url: `${HF}/voice.onnx`, path: 'model.onnx', sizeBytes: 300, sha256: sha256Of(VOICE_BYTES) },
      { url: `${HF}/tokens.txt`, path: 'tokens.txt', sizeBytes: 20, sha256: sha256Of(TOKENS_BYTES) },
    ],
  },
  ESPEAK,
];

function setup(connection: ConnectionType = 'wifi', wifiOnly = true) {
  const remote = new Map<string, Uint8Array>([
    [`${HF}/model.gguf`, MODEL_BYTES],
    [`${HF}/voice.onnx`, VOICE_BYTES],
    [`${HF}/tokens.txt`, TOKENS_BYTES],
    [`${HF}/phondata`, ESPEAK_BYTES],
  ]);
  const fs = new MemoryModelFileSystem(remote);
  const network = { connection: jest.fn(async () => connection) };
  const service = new ModelDownloadService(fs, network, { wifiOnly: () => wifiOnly, catalog: CATALOG });
  return { fs, remote, service };
}

describe('ModelDownloadService', () => {
  it('downloads a model with its required assets, reporting progress up to the total size', async () => {
    const { fs, service } = setup();
    const progress: DownloadProgress[] = [];

    await service.download('voice', { onProgress: (update) => progress.push(update) });

    expect(await service.status('voice')).toBe('downloaded');
    expect(fs.files.get('/docs/models/espeak/espeak-ng-data/phondata')).toEqual(ESPEAK_BYTES);
    expect(fs.files.get('/docs/models/voice/model.onnx')).toEqual(VOICE_BYTES);
    expect(fs.requests.map((request) => request.url)).toEqual([
      `${HF}/phondata`,
      `${HF}/voice.onnx`,
      `${HF}/tokens.txt`,
    ]);
    expect(progress[0]).toEqual({ receivedBytes: 0, totalBytes: 370 });
    expect(progress.at(-1)).toEqual({ receivedBytes: 370, totalBytes: 370 });
  });

  // specky: crit 01M4TPSCQV28RW1SM9HX2Y25E7
  it('resumes an interrupted download from the byte where it stopped', async () => {
    const { fs, service } = setup();
    fs.dropConnection({ url: `${HF}/model.gguf`, afterBytes: 400 });

    await expect(service.download('llm')).rejects.toMatchObject({ code: 'model_download_failed' });
    expect(await service.status('llm')).toBe('partial');

    await service.download('llm');

    expect(fs.requests).toEqual([
      { url: `${HF}/model.gguf`, fromByte: 0 },
      { url: `${HF}/model.gguf`, fromByte: 400 },
    ]);
    expect(fs.files.get('/docs/models/llm/model.gguf')).toEqual(MODEL_BYTES);
    expect(await service.status('llm')).toBe('downloaded');
  });

  it('keeps the received part when the user cancels, so the download can be resumed', async () => {
    const { fs, service } = setup();
    const controller = new AbortController();
    fs.dropConnection({ url: `${HF}/model.gguf`, afterBytes: 250 });
    controller.abort();

    await expect(service.download('llm', { signal: controller.signal })).rejects.toMatchObject({
      code: 'download_cancelled',
    });
    expect(await fs.size('/docs/models/llm/model.gguf.part')).toBe(250);
  });

  // specky: crit 01M4TPSCQVVZ0CY1K7VS5PGGQW
  it('deletes a file whose SHA-256 does not match and reports an error', async () => {
    const { fs, remote, service } = setup();
    remote.set(`${HF}/model.gguf`, bytes(1_000, 99));

    await expect(service.download('llm')).rejects.toEqual(
      expect.objectContaining({ code: 'checksum_mismatch' }),
    );

    expect(await fs.size('/docs/models/llm/model.gguf.part')).toBeNull();
    expect(await fs.size('/docs/models/llm/model.gguf')).toBeNull();
    expect(await service.status('llm')).toBe('missing');
  });

  // specky: crit 01M4TPSCQVTNAKJ3XXG6PS1DZF
  it('on cellular data starts only after the user agrees to use it', async () => {
    const { fs, service } = setup('cellular');

    await expect(service.download('llm')).rejects.toMatchObject({ code: 'cellular_consent_required' });
    expect(fs.requests).toEqual([]);

    await service.download('llm', { allowCellular: true });
    expect(await service.status('llm')).toBe('downloaded');
  });

  it('downloads over cellular without asking when Wi-Fi-only is switched off', async () => {
    const { service } = setup('cellular', false);
    await service.download('llm');
    expect(await service.status('llm')).toBe('downloaded');
  });

  it('refuses to start without any network connection', async () => {
    const { service } = setup('none');
    await expect(service.download('llm', { allowCellular: true })).rejects.toMatchObject({
      code: 'network_unavailable',
    });
  });

  // specky: crit 01M4TPSCQVX5S8GVFJ4EG4PWMG
  it('deleting a model frees its space but keeps assets shared with other models', async () => {
    const { fs, service } = setup();
    await service.download('llm');
    await service.download('voice');
    const before = fs.usedBytes();

    await service.delete('llm');
    await service.delete('voice');

    expect(before).toBe(1_370);
    expect(fs.usedBytes()).toBe(50);
    expect(await service.status('llm')).toBe('missing');
    expect(await service.status('espeak')).toBe('downloaded');
  });

  it('does not download again what is already on the device', async () => {
    const { fs, service } = setup();
    await service.download('espeak');
    await service.download('voice');
    expect(fs.requests.filter((request) => request.url === `${HF}/phondata`)).toHaveLength(1);
  });

  it('rejects unknown model ids and URLs outside the allowed download host', async () => {
    const foreign: CatalogEntry = {
      ...ESPEAK,
      id: 'foreign',
      files: [{ ...ESPEAK_FILE, url: 'https://evil.example/x' }],
    };
    const { fs } = setup();
    const service = new ModelDownloadService(
      fs,
      { connection: async () => 'wifi' },
      { wifiOnly: () => true, catalog: [foreign] },
    );

    await expect(service.download('ghost')).rejects.toMatchObject({ code: 'unknown_model' });
    await expect(service.download('foreign')).rejects.toThrow(DomainError);
    expect(fs.requests).toEqual([]);
  });
});
