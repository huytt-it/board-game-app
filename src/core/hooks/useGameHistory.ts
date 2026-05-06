'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '@core/services/storage/StorageContext';
import type { GameHistoryEvent, AddHistoryEventPayload } from '@core/types/history';

interface UseGameHistoryReturn {
  events: GameHistoryEvent[];
  addEvent: (payload: AddHistoryEventPayload) => Promise<void>;
}

export function useGameHistory(roomId: string | undefined): UseGameHistoryReturn {
  const storage = useStorage();
  const [events, setEvents] = useState<GameHistoryEvent[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = storage.subscribeToHistory(roomId, (e) => setEvents(e));
    return () => unsub();
  }, [roomId, storage]);

  const addEvent = useCallback(
    async (payload: AddHistoryEventPayload) => {
      if (!roomId) return;
      await storage.addHistoryEvent(roomId, payload);
    },
    [roomId, storage]
  );

  return { events, addEvent };
}
