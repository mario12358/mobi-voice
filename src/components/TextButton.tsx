import { Pressable, StyleSheet, Text } from 'react-native';

import { SPACING, usePalette } from '../theme/theme';

interface Props {
  label: string;
  onPress: () => void;
}

export function TextButton({ label, onPress }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
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
