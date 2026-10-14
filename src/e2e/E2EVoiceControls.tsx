import { StyleSheet, View } from 'react-native';

import { TextButton } from '../components/TextButton';
import { useEngines } from '../engines/EngineProvider';
import { pl } from '../i18n/pl';
import { SPACING } from '../theme/theme';
import {
  denyMicrophone,
  E2E_CLOSING,
  E2E_LONG_QUESTION,
  E2E_PART,
  injectUtterance,
  sayStop,
} from './testHooks';

// Rendered only in e2e builds: Detox cannot speak into the microphone or answer the system prompt.
export function E2EVoiceControls() {
  const engines = useEngines();
  if (engines.mode !== 'test') return null;
  return (
    <View style={styles.row}>
      <TextButton testID="e2e.speak" label={pl.common.e2eSpeak} onPress={() => injectUtterance(engines)} />
      <TextButton testID="e2e.deny-mic" label={pl.common.e2eDenyMic} onPress={denyMicrophone} />
      <TextButton
        testID="e2e.speak-part"
        label={pl.common.e2ePart}
        onPress={() => injectUtterance(engines, E2E_PART)}
      />
      <TextButton
        testID="e2e.speak-closing"
        label={pl.common.e2eClosing}
        onPress={() => injectUtterance(engines, E2E_CLOSING)}
      />
      <TextButton
        testID="e2e.speak-long"
        label={pl.common.e2eLong}
        onPress={() => injectUtterance(engines, E2E_LONG_QUESTION)}
      />
      <TextButton testID="e2e.say-stop" label={pl.common.e2eSayStop} onPress={() => sayStop(engines)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
