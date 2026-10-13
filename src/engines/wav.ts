import type { AudioChunk } from './types';

function readAscii(view: DataView, offset: number, length: number): string {
  let text = '';
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index));
  }
  return text;
}

interface WavFormat {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function readFormat(view: DataView, offset: number): WavFormat {
  const audioFormat = view.getUint16(offset, true);
  const format = {
    channels: view.getUint16(offset + 2, true),
    sampleRate: view.getUint32(offset + 4, true),
    bitsPerSample: view.getUint16(offset + 14, true),
  };
  if (audioFormat !== 1 || format.bitsPerSample !== 16) {
    throw new Error('Only 16-bit PCM WAV is supported');
  }
  return format;
}

function toMonoFloat(view: DataView, offset: number, length: number, channels: number): Float32Array {
  const frames = Math.floor(length / (2 * channels));
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += view.getInt16(offset + (frame * channels + channel) * 2, true);
    }
    samples[frame] = sum / channels / 32768;
  }
  return samples;
}

export function parseWav(buffer: ArrayBuffer): AudioChunk {
  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file');
  }
  let format: WavFormat | null = null;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === 'fmt ') format = readFormat(view, body);
    if (chunkId === 'data') {
      if (format === null) throw new Error('WAV data chunk before fmt chunk');
      const length = Math.min(chunkSize, view.byteLength - body);
      return { samples: toMonoFloat(view, body, length, format.channels), sampleRate: format.sampleRate };
    }
    offset = body + chunkSize + (chunkSize % 2);
  }
  throw new Error('WAV file has no data chunk');
}
