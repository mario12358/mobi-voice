import appJson from '../../app.json';

type BuildPropertiesPlugin = [
  'expo-build-properties',
  { ios: { deploymentTarget: string }; android: { minSdkVersion: number; buildArchs: string[] } },
];

function findBuildProperties(): BuildPropertiesPlugin[1] | undefined {
  const plugin = appJson.expo.plugins.find(
    (entry): entry is BuildPropertiesPlugin => Array.isArray(entry) && entry[0] === 'expo-build-properties',
  );
  return plugin?.[1];
}

describe('app config: one codebase for iOS and Android', () => {
  it('targets exactly iOS and Android', () => {
    expect([...appJson.expo.platforms].sort()).toEqual(['android', 'ios']);
  });

  it('declares iOS 16.4+, Android 10 (API 29) and arm64 only', () => {
    expect(findBuildProperties()).toEqual({
      ios: { deploymentTarget: '16.4' },
      android: { minSdkVersion: 29, buildArchs: ['arm64-v8a'] },
    });
  });

  it('follows the system light/dark appearance', () => {
    expect(appJson.expo.userInterfaceStyle).toBe('automatic');
  });

  it('declares the microphone with a Polish reason on iOS and the permission on Android', () => {
    expect(appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription).toMatch(/mikrofon/);
    expect(appJson.expo.android.permissions).toContain('android.permission.RECORD_AUDIO');
  });
});
