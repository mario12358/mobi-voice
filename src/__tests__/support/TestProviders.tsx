import type { ReactNode } from 'react';

import { DatabaseProvider } from '../../db/DatabaseProvider';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { EngineProvider } from '../../engines/EngineProvider';
import { createEngineRegistry, type EngineRegistry } from '../../engines/EngineRegistry';
import { MemoryModelFileSystem } from '../../models/download/__tests__/support/memoryModelFileSystem';
import type { DownloadPorts } from '../../services/ServicesProvider';
import { ServicesProvider } from '../../services/ServicesProvider';

interface Props {
  db: SqlDatabase;
  children: ReactNode;
  engines?: EngineRegistry;
  ports?: DownloadPorts;
}

// The app's providers wired for Jest: real SQLite (better-sqlite3), test engines, in-memory downloads.
export function TestProviders({ db, children, engines, ports }: Props) {
  const registry = engines ?? createEngineRegistry('test');
  const downloadPorts = ports ?? {
    fileSystem: new MemoryModelFileSystem(new Map()),
    network: { connection: async () => 'wifi' as const },
  };
  return (
    <EngineProvider createRegistry={() => registry}>
      <DatabaseProvider open={async () => db}>
        <ServicesProvider ports={() => downloadPorts}>{children}</ServicesProvider>
      </DatabaseProvider>
    </EngineProvider>
  );
}
