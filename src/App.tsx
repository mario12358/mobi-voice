import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseProvider } from './db/DatabaseProvider';
import { openAppDatabase } from './db/openDatabase';
import { EngineProvider, useEngines } from './engines/EngineProvider';
import { pl } from './i18n/pl';
import { RootNavigator } from './navigation/RootNavigator';

function TestModeBadge() {
  const engines = useEngines();
  if (engines.mode !== 'test') return null;
  return (
    <Text testID="engine-mode-test" style={styles.badge}>
      {pl.common.testMode}
    </Text>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <EngineProvider>
        <DatabaseProvider open={openAppDatabase}>
          <RootNavigator />
          <TestModeBadge />
          <StatusBar style="auto" />
        </DatabaseProvider>
      </EngineProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', bottom: 4, alignSelf: 'center', fontSize: 10, opacity: 0.6 },
});
