import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { pl } from '../../i18n/pl';
import { MODEL_CATALOG } from '../../models/catalog';
import { SPACING, usePalette } from '../../theme/theme';

// Proper names and license names, not UI text: they stay in their original language.
const LIBRARIES: [string, string][] = [
  ['llama.cpp / llama.rn', 'MIT'],
  ['whisper.cpp / whisper.rn', 'MIT'],
  ['sherpa-onnx', 'Apache License 2.0'],
  ['ONNX Runtime', 'MIT'],
  ['Silero VAD', 'MIT'],
  ['sherpa-onnx KWS zipformer (GigaSpeech)', 'Apache License 2.0'],
];

function Row({ name, license, url }: { name: string; license: string; url?: string }) {
  const palette = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[styles.name, { color: palette.textPrimary }]}>{name}</Text>
      <BodyText>{license}</BodyText>
      {url !== undefined && <BodyText>{url}</BodyText>}
    </View>
  );
}

// MV-UI-2: the license of every model in the catalog and of the on-device libraries.
export function LicensesScreen() {
  const palette = usePalette();
  return (
    <Screen testID="licenses-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
          {pl.licenses.modelsTitle}
        </Text>
        {MODEL_CATALOG.map((entry) => (
          <Row key={entry.id} name={entry.displayName} license={entry.license.name} url={entry.license.url} />
        ))}
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.textPrimary }]}>
          {pl.licenses.librariesTitle}
        </Text>
        {LIBRARIES.map(([name, license]) => (
          <Row key={name} name={name} license={license} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: SPACING.md, paddingBottom: SPACING.lg },
  heading: { fontSize: 17, fontWeight: '600' },
  row: { gap: SPACING.xs },
  name: { fontSize: 16, fontWeight: '600' },
});
