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
    noMatches: 'Żaden temat nie pasuje do wyszukiwania.',
    openSettings: 'Ustawienia',
    newTopic: 'Nowy temat',
    defaultTitle: 'Nowa rozmowa',
    searchPlaceholder: 'Szukaj tematu',
    rename: 'Zmień nazwę',
    renameLabel: (title: string) => `Zmień nazwę tematu ${title}`,
    delete: 'Usuń',
    deleteLabel: (title: string) => `Usuń temat ${title}`,
    deleteConfirmTitle: 'Usunąć temat?',
    deleteConfirmMessage: (title: string) =>
      `Temat «${title}» zostanie usunięty razem z całą rozmową i podsumowaniami.`,
    cancel: 'Anuluj',
    renameDialogTitle: 'Nowa nazwa tematu',
    save: 'Zapisz',
    lastActivity: (date: string) => `Ostatnio: ${date}`,
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
