import { initialSchema } from './001_initial_schema';
import { contextSummaries } from './002_context_summaries';
import { topicTitleSource } from './003_topic_title_source';
import type { Migration } from './Migration';

export const MIGRATIONS: readonly Migration[] = [initialSchema, contextSummaries, topicTitleSource];
