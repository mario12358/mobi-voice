import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { DatabaseProvider } from './db/DatabaseProvider';
import { openAppDatabase } from './db/openDatabase';

export default function App() {
  return (
    <DatabaseProvider open={openAppDatabase}>
      <View style={styles.container}>
        <Text accessibilityRole="header">MobiVoice</Text>
        <StatusBar style="auto" />
      </View>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
