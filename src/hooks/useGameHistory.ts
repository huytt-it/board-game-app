'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@/types/history';

interface UseGameHistoryReturn {
  events: GameHistoryEvent[];
  addEvent: (payload: AddHistoryEventPayload) => Promise<void>;
}

export function useGameHistory(roomId: string | undefined): UseGameHistoryReturn {
  const [events, setEvents] = useState<GameHistoryEvent[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = gameStorage.subscribeToHistory(roomId, (e) => setEvents(e));
    return () => unsub();
  }, [roomId]);

  const addEvent = useCallback(
    async (payload: AddHistoryEventPayload) => {
      if (!roomId) return;
      await gameStorage.addHistoryEvent(roomId, payload);
    },
    [roomId]
  );

  return { events, addEvent };
}
