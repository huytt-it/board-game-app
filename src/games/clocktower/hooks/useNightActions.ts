'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '@core/services/storage/StorageContext';
import type { GameAction, ActionResult } from '@core/types/actions';

interface UseNightActionsReturn {
  actions: GameAction[];
  pendingActions: GameAction[];
  resolvedActions: GameAction[];
  isLoading: boolean;
  resolveAction: (actionId: string, message: string) => Promise<void>;
  sendPrivateMessage: (playerId: string, message: string) => Promise<void>;
  clearAllActions: () => Promise<void>;
}

/**
 * Host-only hook: subscribes to the actions subcollection
 * to monitor and resolve night actions.
 */
export function useNightActions(roomId: string | undefined, hostId?: string): UseNightActionsReturn {
  const storage = useStorage();
  const [actions, setActions] = useState<GameAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    setIsLoading(true);
    const unsub = storage.subscribeToActions(roomId, (a) => {
      setActions(a);
      setIsLoading(false);
    });
    return () => unsub();
  }, [roomId]);

  const pendingActions = actions.filter((a) => a.status === 'pending');
  const resolvedActions = actions.filter((a) => a.status === 'resolved');

  const resolveAction = useCallback(
    async (actionId: string, message: string) => {
      if (!roomId || !hostId) return;
      const result: ActionResult = {
        message,
        resolvedBy: hostId,
        resolvedAt: new Date(),
      };
      await storage.resolveAction(roomId, actionId, result);
    },
    [roomId, hostId]
  );

  const sendPrivateMessage = useCallback(
    async (playerId: string, message: string) => {
      if (!roomId) return;
      await storage.sendPrivateMessage(roomId, playerId, message);
    },
    [roomId]
  );

  const clearAllActions = useCallback(async () => {
    if (!roomId) return;
    await storage.clearActions(roomId);
  }, [roomId]);

  return {
    actions,
    pendingActions,
    resolvedActions,
    isLoading,
    resolveAction,
    sendPrivateMessage,
    clearAllActions,
  };
}
