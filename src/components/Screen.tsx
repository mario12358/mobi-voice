import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING, usePalette } from '../theme/theme';

interface Props {
  testID: string;
  children: ReactNode;
}

// The navigation header covers the top; the bottom and the sides keep clear of the system navigation
// (gesture bar or buttons), which Android draws over the app edge to edge.
export function Screen({ testID, children }: Props) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          paddingBottom: SPACING.md + insets.bottom,
          paddingLeft: SPACING.md + insets.left,
          paddingRight: SPACING.md + insets.right,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SPACING.md, gap: SPACING.md },
});
