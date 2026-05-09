'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5111';
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

    async function authenticate(existingId: string | null) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: existingId }),
        });

        if (!res.ok) throw new Error(`Auth failed: ${res.status}`);

        const data = await res.json();
        const id: string = data.playerId;
        setPlayerId(id);
        localStorage.setItem(STORAGE_KEY, id);
      } catch (err) {
        const fallbackId = existingId ?? crypto.randomUUID();
        setPlayerId(fallbackId);
        localStorage.setItem(STORAGE_KEY, fallbackId);
        setError(err instanceof Error ? err.message : 'Auth failed, using local ID');
      } finally {
        setIsLoading(false);
      }
    }

    authenticate(stored);
  }, []);

  return { playerId, isLoading, error };
}
