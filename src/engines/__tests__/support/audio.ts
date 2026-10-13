import type { AudioChunk } from '../../types';

export const SAMPLE_RATE = 16_000;

export type AudioPart = { tone: number } | { silence: number };

// Builds deterministic test audio: tone parts are a 440 Hz sine, silence parts are zeros (durations in ms).
export function synthesize(parts: AudioPart[], sampleRate = SAMPLE_RATE): AudioChunk {
  const pieces = parts.map((part) => {
    const isTone = 'tone' in part;
    const length = Math.round(((isTone ? part.tone : part.silence) * sampleRate) / 1000);
    return Float32Array.from({ length }, (_, index) =>
      isTone ? 0.3 * Math.sin((2 * Math.PI * 440 * index) / sampleRate) : 0,
    );
  });
  const samples = new Float32Array(pieces.reduce((total, piece) => total + piece.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    samples.set(piece, offset);
    offset += piece.length;
  }
  return { samples, sampleRate };
}

// Writes 16-bit mono PCM WAV — the format injected into the test-mode microphone.
export function encodeWav(chunk: AudioChunk): ArrayBuffer {
  const dataLength = chunk.samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) =>
    [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, chunk.sampleRate, true);
  view.setUint32(28, chunk.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataLength, true);
  chunk.samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, Math.round(clamped * 32767), true);
  });
  return buffer;
}
