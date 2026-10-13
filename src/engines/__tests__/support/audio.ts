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
