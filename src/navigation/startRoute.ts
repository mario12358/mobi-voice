import type { NavigationState, PartialState } from '@react-navigation/native';

import type { TopicRepository } from '../db/repositories/TopicRepository';
import type { RootStackParamList } from './types';

export type StartState = PartialState<NavigationState<RootStackParamList>>;

// The last active topic opens on top of the topic list, so "back" leads to the list.
// The first run without the default models starts with the wizard instead.
export async function resolveStartState(
  topics: Pick<TopicRepository, 'listByLastActivity'>,
  needsOnboarding: () => Promise<boolean> = async () => false,
): Promise<StartState> {
  if (await needsOnboarding()) return { routes: [{ name: 'Onboarding' }] };
  const [lastActive] = await topics.listByLastActivity();
  if (lastActive === undefined) {
    return { routes: [{ name: 'TopicList' }] };
  }
  return {
    index: 1,
    routes: [{ name: 'TopicList' }, { name: 'Conversation', params: { topicId: lastActive.id } }],
  };
}
