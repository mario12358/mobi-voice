import { decodePcm16, NativeMicrophone } from '../NativeMicrophone';

function base64Of(values: number[]): string {
  const bytes = new Uint8Array(new Int16Array(values).buffer);
  return btoa(String.fromCharCode(...bytes));
}

describe('NativeMicrophone', () => {
  it('decodes 16-bit little-endian PCM into samples in [-1, 1)', () => {
    expect(Array.from(decodePcm16(base64Of([0, 16384, -16384, 32767, -32768])))).toEqual([
      0,
      0.5,
      -0.5,
      32767 / 32768,
      -1,
    ]);
  });

  it('reports a missing native module as an unavailable engine', async () => {
    await expect(new NativeMicrophone().start(() => {})).rejects.toMatchObject({
      code: 'engine_unavailable',
    });
  });
});
