import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { DomainError, isDomainError } from '../core/errors';
import { pl } from '../i18n/pl';
import type { SqlDatabase } from './SqlDatabase';

const DatabaseContext = createContext<SqlDatabase | null>(null);

type LoadState =
  { status: 'loading' } | { status: 'ready'; db: SqlDatabase } | { status: 'failed'; error: DomainError };

interface Props {
  open: () => Promise<SqlDatabase>;
  children: ReactNode;
}

function toDomainError(error: unknown): DomainError {
  return isDomainError(error) ? error : new DomainError('storage_error', undefined, { cause: error });
}

export function DatabaseProvider({ open, children }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    open().then(
      (db) => active && setState({ status: 'ready', db }),
      (error: unknown) => active && setState({ status: 'failed', error: toDomainError(error) }),
    );
    return () => {
      active = false;
    };
  }, [open]);

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel={pl.common.loadingData} />
      </View>
    );
  }
  if (state.status === 'failed') {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert">{state.error.userMessage}</Text>
      </View>
    );
  }
  return <DatabaseContext.Provider value={state.db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SqlDatabase {
  const db = useContext(DatabaseContext);
  if (db === null) {
    throw new Error('useDatabase must be used inside DatabaseProvider');
  }
  return db;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
