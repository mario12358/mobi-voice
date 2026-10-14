import { SherpaKeywordSpotter } from '../SherpaKeywordSpotter';

function setup(heard: (string | null)[] = []) {
  const native = {
    loadKws: jest.fn(async () => {}),
    kwsAccept: jest.fn((_samples: Float32Array, _sampleRate: number) => heard.shift() ?? null),
    kwsReset: jest.fn(),
  };
  const spotter = new SherpaKeywordSpotter(() => native, 16_000);
  return { native, spotter };
}

const CHUNK = { samples: new Float32Array(1_600), sampleRate: 16_000 };

describe('SherpaKeywordSpotter', () => {
  it('loads the bundled model for the capture sample rate', async () => {
    const { native, spotter } = setup();
    await spotter.load();
    expect(native.loadKws).toHaveBeenCalledWith(16_000);
  });

  it('hears nothing before start() and after stop()', async () => {
    const { native, spotter } = setup(['stop', 'stop']);
    const heard: string[] = [];

    spotter.accept(CHUNK);
    await spotter.start((keyword) => heard.push(keyword));
    await spotter.stop();
    spotter.accept(CHUNK);

    expect(native.kwsAccept).not.toHaveBeenCalled();
    expect(heard).toEqual([]);
  });

  it('reports "stop" from the audio heard while started, on a fresh stream', async () => {
    const { native, spotter } = setup([null, 'stop']);
    const heard: string[] = [];

    await spotter.start((keyword) => heard.push(keyword));
    spotter.accept(CHUNK);
    spotter.accept(CHUNK);

    expect(native.kwsReset).toHaveBeenCalledTimes(1);
    expect(native.kwsAccept).toHaveBeenCalledWith(expect.any(Float32Array), 16_000);
    expect(heard).toEqual(['stop']);
  });
});
