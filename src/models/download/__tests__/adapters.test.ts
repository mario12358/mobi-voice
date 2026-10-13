import ReactNativeBlobUtil from 'react-native-blob-util';
import { getNetworkStateAsync, NetworkStateType } from 'expo-network';

import { blobUtilFileSystem } from '../blobUtilFileSystem';
import { expoNetworkInfo } from '../expoNetworkInfo';

jest.mock('react-native-blob-util', () => {
  const files = new Map<string, number>();
  const fs = {
    files,
    dirs: { DocumentDir: '/docs' },
    exists: jest.fn(async (path: string) => files.has(path)),
    stat: jest.fn(async (path: string) => ({ size: String(files.get(path) ?? 0) })),
    mv: jest.fn(async (from: string, to: string) => {
      files.set(to, files.get(from) ?? 0);
      files.delete(from);
      return true;
    }),
    appendFile: jest.fn(async (to: string, from: string) => {
      files.set(to, (files.get(to) ?? 0) + (files.get(from) ?? 0));
      return files.get(from) ?? 0;
    }),
    unlink: jest.fn(async (path: string) => {
      files.delete(path);
    }),
    mkdir: jest.fn(async () => undefined),
    hash: jest.fn(async () => 'abc'),
  };
  return { __esModule: true, default: { fs, config: jest.fn() } };
});

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
  NetworkStateType: {
    NONE: 'NONE',
    UNKNOWN: 'UNKNOWN',
    CELLULAR: 'CELLULAR',
    WIFI: 'WIFI',
    ETHERNET: 'ETHERNET',
    VPN: 'VPN',
  },
}));

type MockedFs = typeof ReactNativeBlobUtil.fs & { files: Map<string, number> };
const mockedBlob = jest.mocked(ReactNativeBlobUtil);
const mockedFs = ReactNativeBlobUtil.fs as MockedFs;

interface FakeResponse {
  status: number;
  writtenBytes: number;
  fail?: Error;
}

function stubFetch(response: FakeResponse) {
  const fetch = jest.fn((_method: string, _url: string, _headers: Record<string, string>) => {
    const chunk = '/docs/models/m/model.gguf.part.chunk';
    const result = new Promise((resolve, reject) => {
      mockedFs.files.set(chunk, response.writtenBytes);
      if (response.fail !== undefined) reject(response.fail);
      else resolve({ info: () => ({ status: response.status }) });
    });
    return Object.assign(result, { progress: jest.fn(), cancel: jest.fn() });
  });
  mockedBlob.config.mockReturnValue({ fetch } as unknown as ReturnType<typeof ReactNativeBlobUtil.config>);
  return fetch;
}

const request = (fromByte: number) => ({
  url: 'https://huggingface.co/a/resolve/main/model.gguf',
  destination: '/docs/models/m/model.gguf.part',
  fromByte,
  onProgress: jest.fn(),
  signal: new AbortController().signal,
});

describe('blobUtilFileSystem.downloadAppend', () => {
  beforeEach(() => mockedFs.files.clear());

  it('asks the server only for the missing bytes and appends them to the partial file', async () => {
    mockedFs.files.set('/docs/models/m/model.gguf.part', 400);
    const fetch = stubFetch({ status: 206, writtenBytes: 600 });

    await blobUtilFileSystem.downloadAppend(request(400));

    expect(fetch).toHaveBeenCalledWith('GET', expect.any(String), { Range: 'bytes=400-' });
    expect(await blobUtilFileSystem.size('/docs/models/m/model.gguf.part')).toBe(1_000);
    expect(mockedFs.files.has('/docs/models/m/model.gguf.part.chunk')).toBe(false);
  });

  it('keeps the bytes received before the connection dropped', async () => {
    stubFetch({ status: 0, writtenBytes: 250, fail: new Error('connection reset') });

    await expect(blobUtilFileSystem.downloadAppend(request(0))).rejects.toThrow('connection reset');

    expect(await blobUtilFileSystem.size('/docs/models/m/model.gguf.part')).toBe(250);
  });

  it('refuses a full response to a range request instead of appending the whole file again', async () => {
    mockedFs.files.set('/docs/models/m/model.gguf.part', 400);
    stubFetch({ status: 200, writtenBytes: 1_000 });

    await expect(blobUtilFileSystem.downloadAppend(request(400))).rejects.toThrow('HTTP 200');

    expect(await blobUtilFileSystem.size('/docs/models/m/model.gguf.part')).toBe(400);
  });
});

describe('expoNetworkInfo', () => {
  it.each([
    [{ type: NetworkStateType.WIFI, isConnected: true }, 'wifi'],
    [{ type: NetworkStateType.ETHERNET, isConnected: true }, 'wifi'],
    [{ type: NetworkStateType.CELLULAR, isConnected: true }, 'cellular'],
    [{ type: NetworkStateType.WIFI, isConnected: false }, 'none'],
    [{ type: NetworkStateType.VPN, isConnected: true }, 'other'],
  ])('maps %p to %s', async (state, expected) => {
    jest.mocked(getNetworkStateAsync).mockResolvedValue(state);
    expect(await expoNetworkInfo.connection()).toBe(expected);
  });
});
