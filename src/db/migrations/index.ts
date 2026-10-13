import { initialSchema } from './001_initial_schema';
import type { Migration } from './Migration';

export const MIGRATIONS: readonly Migration[] = [initialSchema];
