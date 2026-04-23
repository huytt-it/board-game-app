'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { SubmitActionPayload } from '@/types/actions';

interface UseClocktowerNightReturn {
  privateMessage: string | null;
  waitingForStoryteller: boolean;
  hasSubmitted: boolean;
  submitAction: (targetId: string, targetName: string) => Promise<void>;
  clearMessage: () => void;
}

/**
 * Player-side hook for Clocktower Night Phase.
 * Submits night actions and listens for Storyteller responses.
 */
export function useClocktowerNight(
  roomId: string | undefined,
  playerId: string | null
): UseClocktowerNightReturn {
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [waitingForStoryteller, setWaitingForStoryteller] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState('');

  // Subscribe to player's own document to receive private messages
  useEffect(() => {
    if (!roomId || !playerId) return;
    const unsub = gameStorage.subscribeToPlayer(roomId, playerId, (player: Player | null) => {
      if (player) {
        setPlayerName(player.name);
        const msg = player.gameData?.privateMessage;
        if (msg && typeof msg === 'string') {
          setPrivateMessage(msg);
          setWaitingForStoryteller(false);
        }
      }
    });
    return () => unsub();
  }, [roomId, playerId]);

  const submitAction = useCallback(
    async (targetId: string, targetName: string) => {
      if (!roomId || !playerId) return;
      const payload: SubmitActionPayload = {
        playerId,
        playerName,
        actionType: 'ability',
        targetId,
        targetName,
      };
      await gameStorage.submitAction(roomId, payload);
      setHasSubmitted(true);
      setWaitingForStoryteller(true);
    },
    [roomId, playerId, playerName]
  );

  const clearMessage = useCallback(() => {
    setPrivateMessage(null);
  }, []);

  return {
    privateMessage,
    waitingForStoryteller,
    hasSubmitted,
    submitAction,
    clearMessage,
  };
}
