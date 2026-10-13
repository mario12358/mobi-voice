import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';

import { useDatabase } from '../../db/DatabaseProvider';
import { TopicRepository, type Topic } from '../../db/repositories/TopicRepository';
import { pl } from '../../i18n/pl';

export interface TopicsState {
  topics: Topic[];
  query: string;
  loaded: boolean;
  setQuery(query: string): void;
  create(): Promise<Topic>;
  rename(id: number, title: string): Promise<void>;
  remove(id: number): Promise<void>;
}

export function useTopics(): TopicsState {
  const db = useDatabase();
  const repository = useMemo(() => new TopicRepository(db), [db]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setTopics(await repository.searchByTitle(query));
    setLoaded(true);
  }, [query, repository]);

  // Reload whenever the list comes back into view: renames, new messages and deletions happen elsewhere.
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const create = useCallback(() => repository.create(pl.topicList.defaultTitle), [repository]);
  const rename = useCallback(
    async (id: number, title: string) => {
      await repository.rename(id, title);
      await reload();
    },
    [reload, repository],
  );
  const remove = useCallback(
    async (id: number) => {
      await repository.delete(id);
      await reload();
    },
    [reload, repository],
  );

  return { topics, query, loaded, setQuery, create, rename, remove };
}
