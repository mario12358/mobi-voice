import { Pressable, StyleSheet, Text } from 'react-native';

import { SPACING, usePalette } from '../theme/theme';

interface Props {
  label: string;
  onPress: () => void;
  testID?: string;
  // Set for one-of-many choices: the chosen option is filled.
  selected?: boolean;
}

export function TextButton({ label, onPress, testID, selected }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: selected ? palette.accent : palette.border,
          backgroundColor: selected ? palette.accent : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? palette.background : palette.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderRadius: 8, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
