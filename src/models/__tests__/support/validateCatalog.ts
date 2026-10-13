import { findAllowedHost } from '../../../core/networkPolicy';
import type { CatalogEntry } from '../../catalog';

const SHA256 = /^[0-9a-f]{64}$/;

function fileProblems(entry: CatalogEntry): string[] {
  const problems: string[] = [];
  const paths = new Set<string>();
  if (entry.files.length === 0) problems.push(`${entry.id}: no files`);
  for (const file of entry.files) {
    if (!SHA256.test(file.sha256)) problems.push(`${entry.id}: bad sha256 for ${file.path}`);
    if (!Number.isInteger(file.sizeBytes) || file.sizeBytes <= 0)
      problems.push(`${entry.id}: bad size for ${file.path}`);
    if (findAllowedHost(file.url)?.purpose !== 'model_download')
      problems.push(`${entry.id}: disallowed URL ${file.url}`);
    if (paths.has(file.path)) problems.push(`${entry.id}: duplicate path ${file.path}`);
    if (file.path.startsWith('/') || file.path.split('/').includes('..')) {
      problems.push(`${entry.id}: unsafe path ${file.path}`);
    }
    paths.add(file.path);
  }
  return problems;
}

export function validateCatalog(entries: readonly CatalogEntry[]): string[] {
  const ids = new Set<string>();
  const problems: string[] = [];
  for (const entry of entries) {
    if (ids.has(entry.id)) problems.push(`duplicate id ${entry.id}`);
    ids.add(entry.id);
    problems.push(...fileProblems(entry));
  }
  for (const entry of entries) {
    for (const required of entry.requires) {
      if (!ids.has(required)) problems.push(`${entry.id}: requires unknown ${required}`);
    }
  }
  return problems;
}
