import { execFileSync } from 'child_process';
import { by, device, element } from 'detox';

import { pl } from '../../src/i18n/pl';

export type Appearance = 'light' | 'dark';

export function setSystemAppearance(appearance: Appearance): void {
  if (device.getPlatform() === 'ios') {
    execFileSync('xcrun', ['simctl', 'ui', device.id, 'appearance', appearance]);
    return;
  }
  execFileSync('adb', [
    '-s',
    device.id,
    'shell',
    'cmd',
    'uimode',
    'night',
    appearance === 'dark' ? 'yes' : 'no',
  ]);
}

// Android has a hardware back; on iOS the native-stack back button carries the localized back title.
export async function goBack(): Promise<void> {
  if (device.getPlatform() === 'android') {
    await device.pressBack();
    return;
  }
  await element(by.label(pl.common.back).and(by.traits(['button'])))
    .atIndex(0)
    .tap();
}
