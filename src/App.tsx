import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { deviceAudioPorts } from './audio/deviceAudio';
import { expoFetch } from './cloud/expoFetch';
import { DatabaseProvider } from './db/DatabaseProvider';
import { CatalogFileSystem } from './e2e/CatalogFileSystem';
import { e2eApiKeys, e2eProviderFetch } from './e2e/fakeProvider';
import { E2E_MEMORY_BYTES, e2eAudioPorts } from './e2e/testHooks';
import { openAppDatabase } from './db/openDatabase';
import { EngineProvider, useEngines } from './engines/EngineProvider';
import { resolveEngineMode } from './engines/EngineRegistry';
import { pl } from './i18n/pl';
import { blobUtilFileSystem } from './models/download/blobUtilFileSystem';
import { expoNetworkInfo } from './models/download/expoNetworkInfo';
import { deviceMemoryBytes } from './models/deviceMemory';
import { RootNavigator } from './navigation/RootNavigator';
import { ServicesProvider, type DevicePorts } from './services/ServicesProvider';
import { SecretStore } from './state/SecretStore';
import { usePalette } from './theme/theme';

const isE2E = resolveEngineMode(process.env.EXPO_PUBLIC_E2E) === 'test';

// e2e builds: WAV files instead of the microphone (no system permission prompt), pretend downloads instead of
// gigabytes from the internet, a 3.7 GB phone so that the 3B models show as not recommended, and a pretend
// cloud provider (keys kept in memory) instead of real API calls.
const devicePorts = (): DevicePorts =>
  isE2E
    ? {
        fileSystem: new CatalogFileSystem(),
        network: { connection: async () => 'wifi' },
        memoryBytes: () => E2E_MEMORY_BYTES,
        audio: e2eAudioPorts,
        apiKeys: e2eApiKeys,
        fetch: e2eProviderFetch,
      }
    : {
        fileSystem: blobUtilFileSystem,
        network: expoNetworkInfo,
        memoryBytes: deviceMemoryBytes,
        audio: deviceAudioPorts,
        apiKeys: SecretStore,
        fetch: expoFetch,
      };

// e2e hooks: Detox cannot read colours, so test builds expose the active theme as a testID.
function TestModeBadge() {
  const engines = useEngines();
  const palette = usePalette();
  if (engines.mode !== 'test') return null;
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text testID="engine-mode-test">{pl.common.testMode}</Text>
      <View testID={`theme-${palette.scheme}`} collapsable={false} style={styles.marker} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <EngineProvider>
        <DatabaseProvider open={openAppDatabase}>
          <ServicesProvider ports={devicePorts}>
            <RootNavigator />
          </ServicesProvider>
          <TestModeBadge />
          <StatusBar style="auto" />
        </DatabaseProvider>
      </EngineProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  marker: { width: 1, height: 1 },
  badge: { position: 'absolute', bottom: 4, alignSelf: 'center', opacity: 0.6 },
});
