import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useEngines } from '../engines/EngineProvider';
import { pl } from '../i18n/pl';
import { SPACING, usePalette } from '../theme/theme';
import {
  denyMicrophone,
  E2E_CLOSING,
  E2E_LONG_QUESTION,
  E2E_PART,
  injectUtterance,
  sayStop,
} from './testHooks';

// Small on purpose: on the narrow CI emulator full-size buttons pushed the conversation out of view.
function HookButton({ testID, label, onPress }: { testID: string; label: string; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { borderColor: palette.border }]}
    >
      <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

// Rendered only in e2e builds: Detox cannot speak into the microphone or answer the system prompt.
export function E2EVoiceControls() {
  const engines = useEngines();
  const palette = usePalette();
  // Any sentence a test wants "said": the fake STT recognizes it in the next injected utterance.
  const [utterance, setUtterance] = useState('');
  if (engines.mode !== 'test') return null;
  return (
    <View style={styles.row}>
      <HookButton testID="e2e.speak" label={pl.common.e2eSpeak} onPress={() => injectUtterance(engines)} />
      <HookButton testID="e2e.deny-mic" label={pl.common.e2eDenyMic} onPress={denyMicrophone} />
      <HookButton
        testID="e2e.speak-part"
        label={pl.common.e2ePart}
        onPress={() => injectUtterance(engines, E2E_PART)}
      />
      <HookButton
        testID="e2e.speak-closing"
        label={pl.common.e2eClosing}
        onPress={() => injectUtterance(engines, E2E_CLOSING)}
      />
      <HookButton
        testID="e2e.speak-long"
        label={pl.common.e2eLong}
        onPress={() => injectUtterance(engines, E2E_LONG_QUESTION)}
      />
      <TextInput
        testID="e2e.utterance"
        value={utterance}
        onChangeText={setUtterance}
        style={[styles.input, { borderColor: palette.border, color: palette.textSecondary }]}
      />
      <HookButton
        testID="e2e.say-text"
        label={pl.common.e2eSayText}
        onPress={() => injectUtterance(engines, utterance)}
      />
      <HookButton testID="e2e.say-stop" label={pl.common.e2eSayStop} onPress={() => sayStop(engines)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  button: { borderWidth: 1, borderRadius: 4, paddingVertical: 2, paddingHorizontal: SPACING.xs },
  label: { fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    minWidth: 80,
    paddingVertical: 0,
    paddingHorizontal: SPACING.xs,
    fontSize: 11,
  },
});
