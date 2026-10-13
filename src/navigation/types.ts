import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  TopicList: undefined;
  Conversation: { topicId: number };
  Summary: { topicId: number };
  Settings: undefined;
  Models: undefined;
};

export type RootScreenProps<Screen extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Screen
>;
