import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { usePalette } from '../theme/theme';

interface Props {
  children: ReactNode;
  testID?: string;
}

export function BodyText({ children, testID }: Props) {
  const palette = usePalette();
  return (
    <Text testID={testID} style={[styles.text, { color: palette.textSecondary }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 22 },
});
