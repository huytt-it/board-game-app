import type { IAuthProvider } from './IAuthProvider';
import { FirebaseAuthAdapter } from './adapters/FirebaseAuthAdapter';
import { ApiAuthAdapter } from './adapters/ApiAuthAdapter';
import type { AdapterType } from '@core/services/storage/StorageFactory';

export function createAuthAdapter(adapter: AdapterType, apiBaseUrl?: string): IAuthProvider {
  switch (adapter) {
    case 'firebase':
      return new FirebaseAuthAdapter();
    case 'api':
    case 'websocket':
      if (!apiBaseUrl) throw new Error('AuthFactory: apiBaseUrl is required for api/websocket adapter');
      return new ApiAuthAdapter(apiBaseUrl);
    default:
      throw new Error(`AuthFactory: unknown adapter type "${adapter}"`);
  }
}

export const DEFAULT_AUTH_ADAPTER = createAuthAdapter(
  (process.env.NEXT_PUBLIC_STORAGE_ADAPTER as AdapterType | undefined) ?? 'firebase',
  process.env.NEXT_PUBLIC_API_BASE_URL,
);
