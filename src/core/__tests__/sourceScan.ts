import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const SOURCE_ROOT = join(__dirname, '..', '..');
const SOURCE_EXTENSIONS = /\.(ts|tsx)$/;
const TEST_PATH = /(__tests__|\.test\.|\.spec\.)/;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function listSourceFiles(): string[] {
  return walk(SOURCE_ROOT)
    .map((path) => relative(SOURCE_ROOT, path))
    .filter((path) => SOURCE_EXTENSIONS.test(path) && !TEST_PATH.test(path));
}

export function readSource(relativePath: string): string {
  return readFileSync(join(SOURCE_ROOT, relativePath), 'utf8');
}
