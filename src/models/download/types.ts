export interface AppendDownloadRequest {
  url: string;
  // File the downloaded bytes are appended to; it already holds `fromByte` bytes.
  destination: string;
  fromByte: number;
  onProgress: (receivedBytes: number) => void;
  signal: AbortSignal;
}

// The storage operations the download service needs; the app uses react-native-blob-util, tests use memory.
export interface ModelFileSystem {
  readonly modelsRoot: string;
  size(path: string): Promise<number | null>;
  ensureDir(path: string): Promise<void>;
  // Keeps whatever arrived before a failure or abort in `destination`, so the next call can resume.
  downloadAppend(request: AppendDownloadRequest): Promise<void>;
  sha256(path: string): Promise<string>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'other';

export interface NetworkInfo {
  connection(): Promise<ConnectionType>;
}

export type ModelStatus = 'missing' | 'partial' | 'downloaded';

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
}
