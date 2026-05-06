'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { IGameStorage } from './IGameStorage';
import { createStorageAdapter, DEFAULT_STORAGE_CONFIG, type StorageConfig } from './StorageFactory';

// ─── Context ──────────────────────────────────────────────────────────
const StorageContext = createContext<IGameStorage | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────
export function StorageProvider({
  config = DEFAULT_STORAGE_CONFIG,
  children,
}: {
  config?: StorageConfig;
  children: ReactNode;
}) {
  // Stable adapter instance — only recreated when adapter type changes.
  const adapter = useMemo(
    () => createStorageAdapter(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.adapter]
  );

  return (
    <StorageContext.Provider value={adapter}>
      {children}
    </StorageContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────
export function useStorage(): IGameStorage {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used inside <StorageProvider>');
  return ctx;
}
