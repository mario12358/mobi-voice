// Detox e2e: release builds with EXPO_PUBLIC_E2E=1 (fake engines, WAV instead of microphone, no Metro).
const IOS_DEVICE = process.env.DETOX_IOS_DEVICE || 'iPhone 16 Pro';
const ANDROID_AVD = process.env.DETOX_AVD || 'Medium_Phone_API_36.0';
// CI emulators are x86_64; the shipped app stays arm64-only.
const ANDROID_ARCHS = process.env.DETOX_ANDROID_ARCHS
  ? ` -PreactNativeArchitectures=${process.env.DETOX_ANDROID_ARCHS}`
  : '';

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'e2e/jest.config.js' },
    jest: { setupTimeout: 180000 },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/MobiVoice.app',
      build:
        'export EXPO_PUBLIC_E2E=1 && npx expo prebuild --platform ios --clean && xcodebuild -workspace ios/MobiVoice.xcworkspace -scheme MobiVoice -configuration Release -sdk iphonesimulator -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO -quiet',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk',
      build:
        'export EXPO_PUBLIC_E2E=1 && npx expo prebuild --platform android --clean && cd android && ./gradlew :app:assembleRelease :app:assembleAndroidTest -DtestBuildType=release --console=plain' +
        ANDROID_ARCHS,
    },
  },
  devices: {
    simulator: { type: 'ios.simulator', device: { type: IOS_DEVICE } },
    emulator: { type: 'android.emulator', device: { avdName: ANDROID_AVD } },
    attached: {
      type: 'android.attached',
      device: { adbName: process.env.DETOX_ADB_NAME || 'emulator-5554' },
    },
  },
  configurations: {
    'ios.sim.release': { device: 'simulator', app: 'ios.release' },
    'android.emu.release': { device: 'emulator', app: 'android.release' },
    'android.att.release': { device: 'attached', app: 'android.release' },
  },
  artifacts: {
    rootDir: 'artifacts/detox',
  },
};
