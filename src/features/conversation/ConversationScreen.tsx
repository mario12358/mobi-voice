import { useEffect, useMemo } from 'react';

import { BodyText } from '../../components/BodyText';
import { Screen } from '../../components/Screen';
import { TextButton } from '../../components/TextButton';
import { useDatabase } from '../../db/DatabaseProvider';
import { TopicRepository } from '../../db/repositories/TopicRepository';
import { pl } from '../../i18n/pl';
import type { RootScreenProps } from '../../navigation/types';

export function ConversationScreen({ navigation, route }: RootScreenProps<'Conversation'>) {
  const db = useDatabase();
  const topics = useMemo(() => new TopicRepository(db), [db]);
  const { topicId } = route.params;

  useEffect(() => {
    let active = true;
    topics.getById(topicId).then((topic) => {
      if (active && topic !== null) navigation.setOptions({ title: topic.title });
    });
    return () => {
      active = false;
    };
  }, [navigation, topicId, topics]);

  return (
    <Screen testID="conversation-screen">
      <BodyText>{pl.conversation.emptyHistory}</BodyText>
      <TextButton
        label={pl.conversation.openSummary}
        onPress={() => navigation.navigate('Summary', { topicId })}
      />
    </Screen>
  );
}
