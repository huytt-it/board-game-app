'use client';

import { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@core/services/firebase/config';

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
    const stored = localStorage.getItem('boardgame_player_id');
    if (stored) {
      setPlayerId(stored);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setPlayerId(user.uid);
          localStorage.setItem('boardgame_player_id', user.uid);
        } else {
          const cred = await signInAnonymously(auth);
          setPlayerId(cred.user.uid);
          localStorage.setItem('boardgame_player_id', cred.user.uid);
        }
      } catch (err) {
        const fallbackId = crypto.randomUUID();
        setPlayerId(fallbackId);
        localStorage.setItem('boardgame_player_id', fallbackId);
        setError(err instanceof Error ? err.message : 'Auth failed, using local ID');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { playerId, isLoading, error };
}
