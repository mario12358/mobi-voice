import { useCallback, useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useEngines } from '../engines/EngineProvider';
import { FakeTtsEngine } from '../engines/fakes/FakeTtsEngine';
import { pl } from '../i18n/pl';
import { usePalette } from '../theme/theme';

const NONE = () => () => undefined;

// e2e builds only: the last sentence handed to the (fake) voice. Waiting on what was said is steadier
// than catching the brief "speaking" state on a slow CI simulator.
export function E2ESpokenLog() {
  const engines = useEngines();
  const palette = usePalette();
  const tts = engines.mode === 'test' ? engines.tts() : null;
  const fake = tts instanceof FakeTtsEngine ? tts : null;
  const subscribe = useCallback((listener: () => void) => fake?.subscribe(listener) ?? NONE(), [fake]);
  const last = useSyncExternalStore(subscribe, () => fake?.spoken.at(-1) ?? null);
  if (last === null) return null;
  return (
    <Text numberOfLines={1} testID="e2e.spoken" style={[styles.log, { color: palette.textSecondary }]}>
      {pl.common.e2eSpoken(last)}
    </Text>
  );
}

const styles = StyleSheet.create({ log: { fontSize: 11 } });
