import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { pl } from '../i18n/pl';
import { SPACING, usePalette } from '../theme/theme';
import { BodyText } from './BodyText';
import { TextButton } from './TextButton';

interface Props {
  testID: string;
  title: string;
  hint: string;
  initialValue: string;
  onSave: (value: string) => void;
  onRestoreDefault?: () => void;
}

// Mount with a `key` that changes with the stored value to reset the draft.
export function PromptEditor({ testID, title, hint, initialValue, onSave, onRestoreDefault }: Props) {
  const palette = usePalette();
  const [draft, setDraft] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.textPrimary }]}>
        {title}
      </Text>
      <BodyText>{hint}</BodyText>
      <TextInput
        testID={`${testID}.input`}
        accessibilityLabel={title}
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          setSaved(false);
        }}
        multiline
        autoCapitalize="sentences"
        style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
      />
      <View style={styles.actions}>
        {onRestoreDefault !== undefined && (
          <TextButton
            testID={`${testID}.restore`}
            label={pl.promptEditor.restoreDefault}
            onPress={onRestoreDefault}
          />
        )}
        <TextButton
          testID={`${testID}.save`}
          label={saved ? pl.promptEditor.saved : pl.promptEditor.save}
          onPress={() => {
            onSave(draft);
            setSaved(true);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.sm },
  title: { fontSize: 17, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.sm,
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
});
