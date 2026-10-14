import type { CatalogEntry } from './catalog';

const GB = 1_000_000_000;

// Phones sold as "4 GB" report less (memory reserved by the system), so the bar sits 15% below the nominal
// size: a 4 GB phone is not warned about a model made for 4 GB.
const REPORTED_RAM_SHARE = 0.85;

// MV-MOD-4: a warning, never a block. Only language models need this much memory; unknown RAM is no warning.
export function isNotRecommended(entry: CatalogEntry, totalMemoryBytes: number | null): boolean {
  if (entry.kind !== 'llm' || totalMemoryBytes === null) return false;
  return totalMemoryBytes < entry.minRamGb * GB * REPORTED_RAM_SHARE;
}
