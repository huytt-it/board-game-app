import type { IGameStorage } from './IGameStorage';
import { FirebaseAdapter } from './adapters/FirebaseAdapter';
import { ApiAdapter } from './adapters/ApiAdapter';
import { WebSocketAdapter } from './adapters/WebSocketAdapter';

// ─── Adapter configuration ────────────────────────────────────────────
export type AdapterType = 'firebase' | 'api' | 'websocket';

export interface StorageConfig {
  adapter: AdapterType;
  /** Required when adapter === 'api' */
  apiBaseUrl?: string;
  /** Required when adapter === 'websocket' */
  wsUrl?: string;
}

// ─── Factory ──────────────────────────────────────────────────────────
export function createStorageAdapter(config: StorageConfig): IGameStorage {
  switch (config.adapter) {
    case 'firebase':
      return new FirebaseAdapter();
    case 'api':
      if (!config.apiBaseUrl) throw new Error('StorageFactory: apiBaseUrl is required for api adapter');
      return new ApiAdapter(config.apiBaseUrl);
    case 'websocket':
      if (!config.wsUrl) throw new Error('StorageFactory: wsUrl is required for websocket adapter');
      return new WebSocketAdapter(config.wsUrl);
    default:
      throw new Error(`StorageFactory: unknown adapter type "${(config as StorageConfig).adapter}"`);
  }
}

// ─── Default config (read from env) ──────────────────────────────────
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  adapter: (process.env.NEXT_PUBLIC_STORAGE_ADAPTER as AdapterType | undefined) ?? 'firebase',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
};
