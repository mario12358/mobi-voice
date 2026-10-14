import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Milliseconds from the end of the user's utterance (MV-VOICE-8); null when the step did not happen.
export interface LatencySample {
  at: number;
  sttMs: number;
  firstTokenMs: number | null;
  firstAudioMs: number | null;
}

const KEPT_SAMPLES = 50;

interface LatencyState {
  samples: LatencySample[];
  record(sample: LatencySample): void;
  clear(): void;
}

// Kept on the device only, for the diagnostic view; never sent anywhere.
export const useLatencyStore = create<LatencyState>()(
  persist(
    (set) => ({
      samples: [],
      record: (sample) => set((state) => ({ samples: [...state.samples, sample].slice(-KEPT_SAMPLES) })),
      clear: () => set({ samples: [] }),
    }),
    {
      name: 'mobivoice-latency',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ samples: state.samples }),
    },
  ),
);
