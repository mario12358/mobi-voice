import type { ReactNode } from 'react';

import { DatabaseProvider } from '../../db/DatabaseProvider';
import type { SqlDatabase } from '../../db/SqlDatabase';
import { EngineProvider } from '../../engines/EngineProvider';
import { createEngineRegistry, type EngineRegistry } from '../../engines/EngineRegistry';
import { MemoryModelFileSystem } from '../../models/download/__tests__/support/memoryModelFileSystem';
import { FakeAudioPorts } from '../../audio/fakeAudioPorts';
import { MemoryApiKeys } from '../../cloud/__tests__/support/memoryApiKeys';
import type { DevicePorts } from '../../services/ServicesProvider';
import { ServicesProvider } from '../../services/ServicesProvider';

interface Props {
  db: SqlDatabase;
  children: ReactNode;
  engines?: EngineRegistry;
  ports?: Partial<DevicePorts>;
}

// The app's providers wired for Jest: real SQLite (better-sqlite3), test engines, in-memory downloads and audio.
export function TestProviders({ db, children, engines, ports }: Props) {
  const registry = engines ?? createEngineRegistry('test');
  const devicePorts: DevicePorts = {
    fileSystem: new MemoryModelFileSystem(new Map()),
    network: { connection: async () => 'wifi' as const },
    audio: new FakeAudioPorts(),
    memoryBytes: () => null,
    apiKeys: new MemoryApiKeys(),
    // No test reaches a real provider: a request without a recorded server fails like no network.
    fetch: async () => {
      throw new Error('no network in tests');
    },
    ...ports,
  };
  return (
    <EngineProvider createRegistry={() => registry}>
      <DatabaseProvider open={async () => db}>
        <ServicesProvider ports={() => devicePorts}>{children}</ServicesProvider>
      </DatabaseProvider>
    </EngineProvider>
  );
}
