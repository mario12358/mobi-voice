import { DomainError, isDomainError } from '../../core/errors';
import { assertAllowedOutboundUrl } from '../../core/networkPolicy';
import { MODEL_CATALOG, type CatalogEntry, type ModelFile } from '../catalog';
import type { DownloadProgress, ModelFileSystem, ModelStatus, NetworkInfo } from './types';

export interface DownloadOptions {
  allowCellular?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

interface ServiceOptions {
  wifiOnly: () => boolean;
  catalog?: readonly CatalogEntry[];
}

interface PlannedFile {
  entry: CatalogEntry;
  file: ModelFile;
}

export class ModelDownloadService {
  private readonly catalog: readonly CatalogEntry[];
  private readonly wifiOnly: () => boolean;

  constructor(
    private readonly fs: ModelFileSystem,
    private readonly network: NetworkInfo,
    options: ServiceOptions,
  ) {
    this.catalog = options.catalog ?? MODEL_CATALOG;
    this.wifiOnly = options.wifiOnly;
  }

  modelPath(id: string, file: ModelFile): string {
    return `${this.fs.modelsRoot}/${id}/${file.path}`;
  }

  async status(id: string): Promise<ModelStatus> {
    const files = this.plan(id);
    const states = await Promise.all(files.map(({ entry, file }) => this.fileState(entry, file)));
    if (states.every((state) => state === 'complete')) return 'downloaded';
    return states.some((state) => state !== 'missing') ? 'partial' : 'missing';
  }

  async download(id: string, options: DownloadOptions = {}): Promise<void> {
    const files = this.plan(id);
    await this.assertNetworkAllowed(options.allowCellular ?? false);
    const totalBytes = files.reduce((total, { file }) => total + file.sizeBytes, 0);
    let receivedBytes = await this.bytesOnDisk(files);
    options.onProgress?.({ receivedBytes, totalBytes });
    for (const planned of files) {
      receivedBytes += await this.downloadFile(planned, options, (delta) => {
        options.onProgress?.({ receivedBytes: receivedBytes + delta, totalBytes });
      });
    }
  }

  // Shared dependencies (e.g. eSpeak data of the voices) stay; only the model's own directory goes.
  async delete(id: string): Promise<void> {
    this.requireEntry(id);
    await this.fs.remove(`${this.fs.modelsRoot}/${id}`);
  }

  private plan(id: string, seen = new Set<string>()): PlannedFile[] {
    if (seen.has(id)) return [];
    seen.add(id);
    const entry = this.requireEntry(id);
    const dependencies = entry.requires.flatMap((required) => this.plan(required, seen));
    return [...dependencies, ...entry.files.map((file) => ({ entry, file }))];
  }

  private requireEntry(id: string): CatalogEntry {
    const entry = this.catalog.find((candidate) => candidate.id === id);
    if (entry === undefined) throw new DomainError('unknown_model', id);
    return entry;
  }

  private async assertNetworkAllowed(allowCellular: boolean): Promise<void> {
    const connection = await this.network.connection();
    if (connection === 'none') throw new DomainError('network_unavailable');
    if (connection !== 'wifi' && this.wifiOnly() && !allowCellular) {
      throw new DomainError('cellular_consent_required');
    }
  }

  private async fileState(entry: CatalogEntry, file: ModelFile): Promise<'complete' | 'partial' | 'missing'> {
    const path = this.modelPath(entry.id, file);
    if ((await this.fs.size(path)) === file.sizeBytes) return 'complete';
    return (await this.fs.size(`${path}.part`)) === null ? 'missing' : 'partial';
  }

  private async bytesOnDisk(files: PlannedFile[]): Promise<number> {
    let total = 0;
    for (const { entry, file } of files) {
      const path = this.modelPath(entry.id, file);
      const complete = (await this.fs.size(path)) === file.sizeBytes;
      total += complete
        ? file.sizeBytes
        : Math.min((await this.fs.size(`${path}.part`)) ?? 0, file.sizeBytes);
    }
    return total;
  }

  // Returns the number of bytes this call added to the model on disk.
  private async downloadFile(
    { entry, file }: PlannedFile,
    options: DownloadOptions,
    onDelta: (bytes: number) => void,
  ): Promise<number> {
    const target = this.modelPath(entry.id, file);
    if ((await this.fs.size(target)) === file.sizeBytes) return 0;
    assertAllowedOutboundUrl(file.url, 'model_download');
    const partial = `${target}.part`;
    await this.fs.ensureDir(target.slice(0, target.lastIndexOf('/')));
    let fromByte = (await this.fs.size(partial)) ?? 0;
    if (fromByte > file.sizeBytes) {
      await this.fs.remove(partial);
      fromByte = 0;
    }
    if (fromByte < file.sizeBytes) {
      await this.fetchRemainder(file.url, partial, fromByte, options, onDelta);
    }
    await this.verifyAndCommit(file, partial, target);
    return file.sizeBytes - fromByte;
  }

  private async fetchRemainder(
    url: string,
    partial: string,
    fromByte: number,
    options: DownloadOptions,
    onDelta: (bytes: number) => void,
  ): Promise<void> {
    const signal = options.signal ?? new AbortController().signal;
    try {
      await this.fs.downloadAppend({ url, destination: partial, fromByte, onProgress: onDelta, signal });
    } catch (error) {
      if (signal.aborted) throw new DomainError('download_cancelled', url, { cause: error });
      if (isDomainError(error)) throw error;
      throw new DomainError('model_download_failed', url, { cause: error });
    }
  }

  private async verifyAndCommit(file: ModelFile, partial: string, target: string): Promise<void> {
    const actual = await this.fs.sha256(partial);
    if (actual.toLowerCase() !== file.sha256) {
      await this.fs.remove(partial);
      throw new DomainError('checksum_mismatch', `${file.path}: expected ${file.sha256}, got ${actual}`);
    }
    await this.fs.move(partial, target);
  }
}
