// Local port of @config-plugins/detox (which pins expo@^53): Android test runner for Detox e2e builds.
// Applied only when EXPO_PUBLIC_E2E=1 (see app.config.js), so regular builds stay untouched.
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withPlugins,
  withProjectBuildGradle,
} = require('expo/config-plugins');

const MAVEN_MARKER = '// detox-maven-repository';
const DEFAULT_CONFIG_MARKER = '// detox-default-config';
const NETWORK_CONFIG_FILE = 'network_security_config_e2e';

function detoxTestClass(androidPackage) {
  return `package ${androidPackage};

import com.wix.detox.Detox;
import com.wix.detox.config.DetoxConfig;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {
    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @Test
    public void runDetoxTests() {
        DetoxConfig detoxConfig = new DetoxConfig();
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 90;
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60;
        detoxConfig.rnContextLoadTimeoutSec = (${androidPackage}.BuildConfig.DEBUG ? 180 : 60);
        Detox.runTests(mActivityRule, detoxConfig);
    }
}
`;
}

// Detox talks to its test server over ws://localhost (10.0.2.2 from the emulator).
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
`;

const withDetoxProjectGradle = (config) =>
  withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MAVEN_MARKER)) {
      mod.modResults.contents += `
${MAVEN_MARKER}
def detoxMavenPath = new File(["node", "--print", "require.resolve('detox/package.json')"].execute(null, rootDir).text.trim(), "../Detox-android")
allprojects { repositories { maven { url(detoxMavenPath) } } }
`;
    }
    return mod;
  });

const withDetoxAppGradle = (config) =>
  withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("androidTestImplementation('com.wix:detox:+')")) {
      contents = contents.replace(
        /dependencies\s?{/,
        "dependencies {\n    androidTestImplementation('com.wix:detox:+')",
      );
    }
    if (!contents.includes(DEFAULT_CONFIG_MARKER)) {
      contents = contents.replace(
        /defaultConfig\s?{/,
        `defaultConfig {
        ${DEFAULT_CONFIG_MARKER}
        testBuildType System.getProperty('testBuildType', 'debug')
        testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'`,
      );
    }
    mod.modResults.contents = contents;
    return mod;
  });

const withDetoxTestClass = (config) =>
  withDangerousMod(config, [
    'android',
    async (mod) => {
      const androidPackage = mod.android?.package;
      if (!androidPackage) throw new Error('android.package must be defined for Detox');
      const root = mod.modRequest.platformProjectRoot;
      const folder = path.join(root, 'app/src/androidTest/java', ...androidPackage.split('.'));
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, 'DetoxTest.java'), detoxTestClass(androidPackage));
      const xmlFolder = path.join(root, 'app/src/main/res/xml');
      fs.mkdirSync(xmlFolder, { recursive: true });
      fs.writeFileSync(path.join(xmlFolder, `${NETWORK_CONFIG_FILE}.xml`), NETWORK_SECURITY_CONFIG);
      return mod;
    },
  ]);

const withDetoxNetworkSecurity = (config) =>
  withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:networkSecurityConfig'] = `@xml/${NETWORK_CONFIG_FILE}`;
    return mod;
  });

module.exports = (config) =>
  withPlugins(config, [
    withDetoxProjectGradle,
    withDetoxAppGradle,
    withDetoxTestClass,
    withDetoxNetworkSecurity,
  ]);
