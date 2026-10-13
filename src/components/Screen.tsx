import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SPACING, usePalette } from '../theme/theme';

interface Props {
  testID: string;
  children: ReactNode;
}

export function Screen({ testID, children }: Props) {
  const palette = usePalette();
  return (
    <View testID={testID} style={[styles.container, { backgroundColor: palette.background }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.md, gap: SPACING.md },
});
