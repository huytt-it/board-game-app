'use client';

import { useState, useEffect } from 'react';
import { ensureAnonymousUser } from '@/services/firebase/auth';

// Only used when Firebase Auth is unreachable/disabled, so the app keeps a
// stable local identity. The normal identity is the Firebase anonymous uid.
const FALLBACK_ID_KEY = 'boardgame_player_id';

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
    let cancelled = false;

    // Always go through Firebase Auth — never trust a cached id on its own.
    // Otherwise Firebase Auth is never initialised on repeat visits and every
    // Firestore request goes out unauthenticated.
    ensureAnonymousUser()
      .then((user) => {
        if (!cancelled) setPlayerId(user.uid);
      })
      .catch((err) => {
        if (cancelled) return;
        const fallbackId = localStorage.getItem(FALLBACK_ID_KEY) ?? crypto.randomUUID();
        localStorage.setItem(FALLBACK_ID_KEY, fallbackId);
        setPlayerId(fallbackId);
        setError(err instanceof Error ? err.message : 'Auth failed, using local ID');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { playerId, isLoading, error };
}
