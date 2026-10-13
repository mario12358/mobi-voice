import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';

export function TopicListScreen({ navigation }: RootScreenProps<'TopicList'>) {
  return (
    <Screen testID="topic-list-screen">
      <BodyText>{pl.topicList.empty}</BodyText>
      <TextButton
        testID="topic-list.open-settings"
        label={pl.topicList.openSettings}
        onPress={() => navigation.navigate('Settings')}
      />
    </Screen>
  );
}
