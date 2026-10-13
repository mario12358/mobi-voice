import { initialSchema } from './001_initial_schema';
import { contextSummaries } from './002_context_summaries';
import type { Migration } from './Migration';

export const MIGRATIONS: readonly Migration[] = [initialSchema, contextSummaries];
