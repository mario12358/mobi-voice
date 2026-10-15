import { useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useEngines } from '../engines/EngineProvider';
import { pl } from '../i18n/pl';
import { usePalette } from '../theme/theme';
import { e2eShareSheet } from './testHooks';

const subscribe = (listener: () => void) => e2eShareSheet.subscribe(listener);
const version = () => e2eShareSheet.version;

// e2e builds only: what the last "Udostępnij" sent, in place of the system sheet Detox cannot read.
export function E2EShareLog() {
  const engines = useEngines();
  const palette = usePalette();
  useSyncExternalStore(subscribe, version);
  const last = e2eShareSheet.shared.at(-1);
  if (engines.mode !== 'test' || last === undefined) return null;
  return (
    <Text numberOfLines={1} testID="e2e.shared" style={[styles.log, { color: palette.textSecondary }]}>
      {pl.common.e2eShared(e2eShareSheet.shared.length, last.text.split('\n')[0] ?? '')}
    </Text>
  );
}

const styles = StyleSheet.create({ log: { fontSize: 11 } });
