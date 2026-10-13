import { createHash } from 'crypto';

import type { AppendDownloadRequest, ModelFileSystem } from '../../types';

export interface DropRule {
  url: string;
  // The connection drops after this many bytes of the current request.
  afterBytes: number;
}

// In-memory files plus a fake HTTP server that honours byte ranges (fromByte).
export class MemoryModelFileSystem implements ModelFileSystem {
  readonly modelsRoot = '/docs/models';
  readonly files = new Map<string, Uint8Array>();
  readonly requests: { url: string; fromByte: number }[] = [];
  private readonly drops: DropRule[] = [];

  constructor(private readonly remote: Map<string, Uint8Array>) {}

  dropConnection(rule: DropRule): void {
    this.drops.push(rule);
  }

  async size(path: string): Promise<number | null> {
    return this.files.get(path)?.length ?? null;
  }

  async ensureDir(): Promise<void> {}

  async downloadAppend({
    url,
    destination,
    fromByte,
    onProgress,
    signal,
  }: AppendDownloadRequest): Promise<void> {
    this.requests.push({ url, fromByte });
    const body = this.remote.get(url);
    if (body === undefined) throw new Error(`404 ${url}`);
    const dropIndex = this.drops.findIndex((rule) => rule.url === url);
    const drop = dropIndex >= 0 ? this.drops.splice(dropIndex, 1)[0] : undefined;
    const remainder = body.subarray(fromByte);
    const delivered = drop === undefined ? remainder : remainder.subarray(0, drop.afterBytes);
    const existing = this.files.get(destination) ?? new Uint8Array();
    this.files.set(destination, Uint8Array.from([...existing, ...delivered]));
    onProgress(delivered.length);
    if (signal.aborted) throw new Error('aborted');
    if (drop !== undefined) throw new Error('connection reset');
  }

  async sha256(path: string): Promise<string> {
    return createHash('sha256')
      .update(this.files.get(path) ?? new Uint8Array())
      .digest('hex');
  }

  async move(from: string, to: string): Promise<void> {
    const content = this.files.get(from);
    if (content === undefined) throw new Error(`missing ${from}`);
    this.files.set(to, content);
    this.files.delete(from);
  }

  async remove(path: string): Promise<void> {
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(`${path}/`)) this.files.delete(key);
    }
  }

  usedBytes(): number {
    return [...this.files.values()].reduce((total, content) => total + content.length, 0);
  }
}

export function sha256Of(content: Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}
