import { encodeWav, parseWav } from '../wav';
import { synthesize } from './support/audio';

function stereoWav(left: number, right: number): ArrayBuffer {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, 40, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 8_000, true);
  view.setUint32(28, 32_000, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, 4, true);
  view.setInt16(44, left, true);
  view.setInt16(46, right, true);
  return buffer;
}

describe('WAV parsing', () => {
  it('round-trips 16-bit mono PCM', () => {
    const audio = synthesize([{ tone: 50 }]);
    const parsed = parseWav(encodeWav(audio));

    expect(parsed.sampleRate).toBe(16_000);
    expect(parsed.samples).toHaveLength(audio.samples.length);
    parsed.samples.forEach((sample, index) => expect(sample).toBeCloseTo(audio.samples[index] ?? 0, 3));
  });

  it('mixes stereo down to mono', () => {
    const parsed = parseWav(stereoWav(16_384, -16_384 + 8_192));
    expect(parsed.sampleRate).toBe(8_000);
    expect(Array.from(parsed.samples)).toEqual([0.125]);
  });

  it('rejects files that are not WAV', () => {
    expect(() => parseWav(new TextEncoder().encode('ID3 not a wav file at all').buffer)).toThrow(/RIFF/);
  });
});
