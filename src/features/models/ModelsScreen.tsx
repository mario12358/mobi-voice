import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { pl } from '../../i18n/pl';

export function ModelsScreen() {
  return (
    <Screen testID="models-screen">
      <BodyText>{pl.models.placeholder}</BodyText>
    </Screen>
  );
}
