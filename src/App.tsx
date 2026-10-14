import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { deviceAudioPorts } from './audio/deviceAudio';
import { FakeAudioPorts } from './audio/fakeAudioPorts';
import { DatabaseProvider } from './db/DatabaseProvider';
import { openAppDatabase } from './db/openDatabase';
import { EngineProvider, useEngines } from './engines/EngineProvider';
import { resolveEngineMode } from './engines/EngineRegistry';
import { pl } from './i18n/pl';
import { blobUtilFileSystem } from './models/download/blobUtilFileSystem';
import { expoNetworkInfo } from './models/download/expoNetworkInfo';
import { RootNavigator } from './navigation/RootNavigator';
import { ServicesProvider, type DevicePorts } from './services/ServicesProvider';
import { usePalette } from './theme/theme';

const devicePorts = (): DevicePorts => ({
  fileSystem: blobUtilFileSystem,
  network: expoNetworkInfo,
  // e2e builds feed WAV files instead of the microphone, so no system permission prompt may appear.
  audio: resolveEngineMode(process.env.EXPO_PUBLIC_E2E) === 'test' ? new FakeAudioPorts() : deviceAudioPorts,
});

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
