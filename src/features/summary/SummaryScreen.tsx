import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';
import { SPACING, usePalette } from '../../theme/theme';
import { useSummary } from './useSummary';

// MV-SUM-1: the whole topic summarized in a chosen form, kept with the topic; copy, share, listen.
export function SummaryScreen({ route }: RootScreenProps<'Summary'>) {
  const view = useSummary(route.params.topicId);
  const palette = usePalette();
  const [templateName, setTemplateName] = useState('');
  const custom = view.choice?.kind === 'custom';
  const hasSummary = view.summary !== null;
  const inputStyle = [styles.input, { color: palette.textPrimary, borderColor: palette.border }];

  return (
    <Screen testID="summary-screen">
      <ScrollView
        testID="summary.scroll"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
          {pl.summary.formTitle}
        </Text>
        <View style={styles.choices}>
          {view.templates.map((template) => (
            <TextButton
              key={template.id}
              testID={`summary.template-${template.id}`}
              label={template.name}
              selected={view.choice?.kind === 'template' && view.choice.templateId === template.id}
              onPress={() => view.choose({ kind: 'template', templateId: template.id })}
            />
          ))}
          <TextButton
            testID="summary.template-custom"
            label={pl.summary.custom}
            selected={custom}
            onPress={() => view.choose({ kind: 'custom' })}
          />
        </View>
        {custom && (
          <View style={styles.custom}>
            <TextInput
              testID="summary.custom-instruction"
              accessibilityLabel={pl.summary.customLabel}
              placeholder={pl.summary.customPlaceholder}
              placeholderTextColor={palette.textSecondary}
              value={view.customInstruction}
              onChangeText={view.setCustomInstruction}
              multiline
              style={inputStyle}
            />
            <TextInput
              testID="summary.template-name"
              accessibilityLabel={pl.summary.templateNameLabel}
              placeholder={pl.summary.templateNamePlaceholder}
              placeholderTextColor={palette.textSecondary}
              value={templateName}
              onChangeText={setTemplateName}
              style={inputStyle}
            />
            <TextButton
              testID="summary.save-template"
              label={pl.summary.saveTemplate}
              onPress={() => void view.saveCustomAsTemplate(templateName).then(() => setTemplateName(''))}
            />
          </View>
        )}
        {view.generating ? (
          <View style={styles.actions}>
            <BodyText testID="summary.generating">{pl.summary.generating}</BodyText>
            <TextButton testID="summary.cancel" label={pl.summary.cancel} onPress={view.cancel} />
          </View>
        ) : (
          <TextButton
            testID="summary.generate"
            label={hasSummary ? pl.summary.regenerate : pl.summary.generate}
            onPress={() => void view.generate()}
          />
        )}
        {view.error !== null && (
          <Text testID="summary.error" accessibilityRole="alert" style={{ color: palette.accent }}>
            {view.error.userMessage}
          </Text>
        )}
        {view.summary === null ? (
          <BodyText testID="summary.empty">{pl.summary.placeholder}</BodyText>
        ) : (
          <View style={[styles.card, { borderColor: palette.border }]}>
            <Text testID="summary.content" selectable style={[styles.body, { color: palette.textPrimary }]}>
              {view.summary.content}
            </Text>
            <View style={styles.actions}>
              <TextButton testID="summary.copy" label={pl.summary.copy} onPress={() => void view.copy()} />
              <TextButton testID="summary.share" label={pl.summary.share} onPress={() => void view.share()} />
              <TextButton
                testID="summary.listen"
                label={view.speaking ? pl.summary.stopListening : pl.summary.listen}
                onPress={() => void view.toggleSpeaking()}
              />
            </View>
            {view.copied && <BodyText testID="summary.copied">{pl.summary.copied}</BodyText>}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.md, paddingBottom: SPACING.lg },
  heading: { fontSize: 17, fontWeight: '600' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  custom: { gap: SPACING.sm },
  input: { borderWidth: 1, borderRadius: 8, padding: SPACING.sm, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 8, padding: SPACING.md, gap: SPACING.md },
  body: { fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm },
});
