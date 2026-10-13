// Every user-facing string lives here (MV-UI-1); a second language would be a sibling file with the same shape.
export const pl = {
  common: {
    loadingData: 'Ładowanie danych',
    testMode: 'Tryb testowy',
    back: 'Wstecz',
  },
  topicList: {
    title: 'Tematy',
    empty: 'Nie masz jeszcze żadnych tematów.',
    openSettings: 'Ustawienia',
  },
  conversation: {
    title: 'Rozmowa',
    emptyHistory: 'Zacznij rozmowę — napisz albo powiedz, o czym chcesz porozmawiać.',
    openSummary: 'Podsumuj',
  },
  summary: {
    title: 'Podsumowanie',
    placeholder: 'Tu pojawi się podsumowanie rozmowy.',
  },
  settings: {
    title: 'Ustawienia',
    openModels: 'Modele',
  },
  models: {
    title: 'Modele',
    placeholder: 'Tu pobierzesz modele językowe, rozpoznawania mowy i głosy.',
  },
} as const;

export type Translations = typeof pl;
