import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { pl } from '../../i18n/pl';

export function SummaryScreen() {
  return (
    <Screen testID="summary-screen">
      <BodyText>{pl.summary.placeholder}</BodyText>
    </Screen>
  );
}
