'use client';

import { StorageProvider } from '@core/services/storage/StorageContext';
import { DEFAULT_STORAGE_CONFIG } from '@core/services/storage/StorageFactory';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StorageProvider config={DEFAULT_STORAGE_CONFIG}>
      {children}
    </StorageProvider>
  );
}
