import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { DatabaseProvider } from './db/DatabaseProvider';
import { openAppDatabase } from './db/openDatabase';
import { EngineProvider, useEngines } from './engines/EngineProvider';

function TestModeBadge() {
  const engines = useEngines();
  if (engines.mode !== 'test') return null;
  return <Text testID="engine-mode-test">Tryb testowy</Text>;
}

export default function App() {
  return (
    <EngineProvider>
      <DatabaseProvider open={openAppDatabase}>
        <View style={styles.container}>
          <Text accessibilityRole="header">MobiVoice</Text>
          <TestModeBadge />
          <StatusBar style="auto" />
        </View>
      </DatabaseProvider>
    </EngineProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
