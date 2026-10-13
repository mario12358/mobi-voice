import { createContext, useContext, useState, type ReactNode } from 'react';

import { createEngineRegistry, resolveEngineMode, type EngineRegistry } from './EngineRegistry';

const EngineContext = createContext<EngineRegistry | null>(null);

export function createAppEngineRegistry(): EngineRegistry {
  return createEngineRegistry(resolveEngineMode(process.env.EXPO_PUBLIC_E2E));
}

interface Props {
  children: ReactNode;
  createRegistry?: () => EngineRegistry;
}

export function EngineProvider({ children, createRegistry = createAppEngineRegistry }: Props) {
  const [registry] = useState(createRegistry);
  return <EngineContext.Provider value={registry}>{children}</EngineContext.Provider>;
}

export function useEngines(): EngineRegistry {
  const registry = useContext(EngineContext);
  if (registry === null) {
    throw new Error('useEngines must be used inside EngineProvider');
  }
  return registry;
}
