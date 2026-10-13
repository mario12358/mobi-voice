import ReactNativeBlobUtil from 'react-native-blob-util';

import type { AppendDownloadRequest, ModelFileSystem } from './types';

const { fs } = ReactNativeBlobUtil;

async function size(path: string): Promise<number | null> {
  if (!(await fs.exists(path))) return null;
  return Number((await fs.stat(path)).size);
}

async function appendChunk(destination: string, chunk: string): Promise<void> {
  if ((await size(chunk)) === null) return;
  if ((await size(destination)) === null) {
    await fs.mv(chunk, destination);
    return;
  }
  await fs.appendFile(destination, chunk, 'uri');
  await fs.unlink(chunk);
}

async function downloadAppend({ url, destination, fromByte, onProgress, signal }: AppendDownloadRequest) {
  // Each attempt writes to a side chunk which is appended in `finally`, so bytes received before an
  // abort or a dropped connection are kept and the next attempt asks only for the rest (HTTP Range).
  const chunk = `${destination}.chunk`;
  const headers: Record<string, string> = fromByte > 0 ? { Range: `bytes=${fromByte}-` } : {};
  const task = ReactNativeBlobUtil.config({ path: chunk, overwrite: true }).fetch('GET', url, headers);
  const cancel = () => task.cancel();
  signal.addEventListener('abort', cancel);
  try {
    task.progress({ interval: 250 }, (received) => onProgress(Number(received)));
    const response = await task;
    const status = response.info().status;
    if (status >= 400 || (fromByte > 0 && status !== 206)) {
      await fs.unlink(chunk);
      throw new Error(`HTTP ${status} for ${url}`);
    }
  } finally {
    signal.removeEventListener('abort', cancel);
    await appendChunk(destination, chunk);
  }
}

export const blobUtilFileSystem: ModelFileSystem = {
  modelsRoot: `${fs.dirs.DocumentDir}/models`,
  size,
  async ensureDir(path) {
    if (!(await fs.exists(path))) await fs.mkdir(path);
  },
  downloadAppend,
  async sha256(path) {
    return fs.hash(path, 'sha256');
  },
  async move(from, to) {
    if (await fs.exists(to)) await fs.unlink(to);
    await fs.mv(from, to);
  },
  async remove(path) {
    if (await fs.exists(path)) await fs.unlink(path);
  },
};
