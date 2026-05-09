'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_AUTH_ADAPTER } from '@core/services/auth/AuthFactory';

const STORAGE_KEY = 'boardgame_player_id';

interface UseAuthReturn {
  playerId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    async function authenticate() {
      try {
        const id = await DEFAULT_AUTH_ADAPTER.authenticate(stored);
        setPlayerId(id);
        localStorage.setItem(STORAGE_KEY, id);
      } catch (err) {
        const fallbackId = stored ?? crypto.randomUUID();
        setPlayerId(fallbackId);
        localStorage.setItem(STORAGE_KEY, fallbackId);
        setError(err instanceof Error ? err.message : 'Auth failed, using local ID');
      } finally {
        setIsLoading(false);
      }
    }

    authenticate();
  }, []);

  return { playerId, isLoading, error };
}
