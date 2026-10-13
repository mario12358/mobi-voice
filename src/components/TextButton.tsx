import { Pressable, StyleSheet, Text } from 'react-native';

import { SPACING, usePalette } from '../theme/theme';

interface Props {
  label: string;
  onPress: () => void;
  testID?: string;
}

export function TextButton({ label, onPress, testID }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { borderColor: palette.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[styles.label, { color: palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
