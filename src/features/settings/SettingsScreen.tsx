import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  return (
    <Screen testID="settings-screen">
      <TextButton label={pl.settings.openModels} onPress={() => navigation.navigate('Models')} />
    </Screen>
  );
}
