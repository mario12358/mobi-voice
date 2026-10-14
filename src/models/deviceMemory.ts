import * as Device from 'expo-device';

// Total RAM of this phone in bytes, or null where the platform does not tell.
export function deviceMemoryBytes(): number | null {
  return Device.totalMemory;
}
