import { StyleSheet, View } from 'react-native';

import { TextButton } from '../components/TextButton';
import { useEngines } from '../engines/EngineProvider';
import { pl } from '../i18n/pl';
import { SPACING } from '../theme/theme';
import { denyMicrophone, injectUtterance } from './testHooks';

// Rendered only in e2e builds: Detox cannot speak into the microphone or answer the system prompt.
export function E2EVoiceControls() {
  const engines = useEngines();
  if (engines.mode !== 'test') return null;
  return (
    <View style={styles.row}>
      <TextButton testID="e2e.speak" label={pl.common.e2eSpeak} onPress={() => injectUtterance(engines)} />
      <TextButton testID="e2e.deny-mic" label={pl.common.e2eDenyMic} onPress={denyMicrophone} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
