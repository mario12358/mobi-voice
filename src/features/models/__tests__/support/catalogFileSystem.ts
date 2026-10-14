import { MODEL_CATALOG, type ModelFile } from '../../../../models/catalog';
import type { AppendDownloadRequest, ModelFileSystem } from '../../../../models/download/types';

const FILES_BY_URL = new Map<string, ModelFile>(
  MODEL_CATALOG.flatMap((entry) => entry.files.map((file) => [file.url, file] as const)),
);

// Pretends to download catalog files without holding gigabytes: only sizes and checksums are tracked.
// With `holdDownloads` a download stays open half-way until the test calls release().
export class CatalogFileSystem implements ModelFileSystem {
  readonly modelsRoot = '/docs/models';
  readonly sizes = new Map<string, number>();
  readonly requests: string[] = [];
  private readonly checksums = new Map<string, string>();
  private pending: (() => void)[] = [];

  constructor(private readonly holdDownloads = false) {}

  async size(path: string): Promise<number | null> {
    return this.sizes.get(path) ?? null;
  }

  async ensureDir(): Promise<void> {}

  async downloadAppend({
    url,
    destination,
    fromByte,
    onProgress,
    signal,
  }: AppendDownloadRequest): Promise<void> {
    const file = FILES_BY_URL.get(url);
    if (file === undefined) throw new Error(`404 ${url}`);
    this.requests.push(url);
    const half = Math.floor((file.sizeBytes - fromByte) / 2);
    this.sizes.set(destination, fromByte + half);
    onProgress(half);
    if (this.holdDownloads) {
      await new Promise<void>((resolve, reject) => {
        this.pending.push(resolve);
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    if (signal.aborted) throw new Error('aborted');
    this.sizes.set(destination, file.sizeBytes);
    this.checksums.set(destination, file.sha256);
    onProgress(file.sizeBytes - fromByte - half);
  }

  async sha256(path: string): Promise<string> {
    return this.checksums.get(path) ?? '';
  }

  async move(from: string, to: string): Promise<void> {
    this.sizes.set(to, this.sizes.get(from) ?? 0);
    this.sizes.delete(from);
  }

  async remove(path: string): Promise<void> {
    for (const key of [...this.sizes.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.sizes.delete(key);
    }
  }

  // Puts a catalog entry on the "disk" as if downloaded earlier.
  async preload(id: string): Promise<void> {
    const entry = MODEL_CATALOG.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new Error(`unknown ${id}`);
    for (const file of entry.files) this.sizes.set(`${this.modelsRoot}/${id}/${file.path}`, file.sizeBytes);
  }

  release(): void {
    const pending = this.pending;
    this.pending = [];
    for (const resolve of pending) resolve();
  }
}
