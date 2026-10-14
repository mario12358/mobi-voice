import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useDatabase } from '../db/DatabaseProvider';
import { useEngines } from '../engines/EngineProvider';
import { TopicRepository } from '../db/repositories/TopicRepository';
import { ApiKeysScreen } from '../features/apiKeys/ApiKeysScreen';
import { ConversationScreen } from '../features/conversation/ConversationScreen';
import { ModelsScreen } from '../features/models/ModelsScreen';
import { needsOnboarding } from '../features/onboarding/onboarding';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { LicensesScreen } from '../features/settings/LicensesScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { SummaryScreen } from '../features/summary/SummaryScreen';
import { TopicListScreen } from '../features/topics/TopicListScreen';
import { pl } from '../i18n/pl';
import { useServices } from '../services/ServicesProvider';
import { usePalette, type Palette } from '../theme/theme';
import { resolveStartState, type StartState } from './startRoute';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function navigationTheme(palette: Palette): Theme {
  const base = palette.scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.surface,
      text: palette.textPrimary,
      border: palette.border,
    },
  };
}

export function RootNavigator() {
  const db = useDatabase();
  const palette = usePalette();
  const engines = useEngines();
  const { downloads } = useServices();
  const [startState, setStartState] = useState<StartState | null>(null);

  useEffect(() => {
    let active = true;
    // Test builds use fake engines that need no models, so they never show the wizard.
    const onboarding = () =>
      engines.mode === 'test' ? Promise.resolve(false) : needsOnboarding((id) => downloads.status(id));
    resolveStartState(new TopicRepository(db), onboarding).then((state) => active && setStartState(state));
    return () => {
      active = false;
    };
  }, [db, downloads, engines]);

  if (startState === null) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator accessibilityLabel={pl.common.loadingData} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme(palette)} initialState={startState}>
      <Stack.Navigator screenOptions={{ headerBackTitle: pl.common.back }}>
        <Stack.Screen name="TopicList" component={TopicListScreen} options={{ title: pl.topicList.title }} />
        <Stack.Screen
          name="Conversation"
          component={ConversationScreen}
          options={{ title: pl.conversation.title }}
        />
        <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: pl.summary.title }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: pl.settings.title }} />
        <Stack.Screen name="Models" component={ModelsScreen} options={{ title: pl.models.title }} />
        <Stack.Screen name="Licenses" component={LicensesScreen} options={{ title: pl.licenses.title }} />
        <Stack.Screen name="ApiKeys" component={ApiKeysScreen} options={{ title: pl.apiKeys.title }} />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ title: pl.onboarding.title }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center' },
});
