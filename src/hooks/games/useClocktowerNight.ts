'use client';

import { useState, useEffect, useCallback } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { SubmitActionPayload } from '@/types/actions';
import { FIRST_NIGHT_ROLES, OTHER_NIGHT_ROLES, type ClocktowerRole } from '@/types/games/clocktower';

interface UseClocktowerNightReturn {
  privateMessage: string | null;
  waitingForStoryteller: boolean;
  hasSubmitted: boolean;
  hasNightAction: boolean;
  submitAction: (targetId: string, targetName: string) => Promise<void>;
  clearMessage: () => void;
}

/**
 * Player-side hook for Clocktower Night Phase.
 * Submits night actions and listens for Storyteller responses.
 * Dead players and roles without night abilities are blocked.
 */
export function useClocktowerNight(
  roomId: string | undefined,
  playerId: string | null,
  dayCount: number = 0
): UseClocktowerNightReturn {
  const [privateMessage, setPrivateMessage] = useState<string | null>(null);
  const [waitingForStoryteller, setWaitingForStoryteller] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isAlive, setIsAlive] = useState(true);
  const [playerRole, setPlayerRole] = useState<ClocktowerRole | null>(null);

  // Determine if this role has a night action based on dayCount
  const hasNightAction = playerRole 
    ? (dayCount === 0 ? FIRST_NIGHT_ROLES.includes(playerRole) : OTHER_NIGHT_ROLES.includes(playerRole))
    : false;

  // Subscribe to player's own document to receive private messages
  useEffect(() => {
    if (!roomId || !playerId) return;
    const unsub = gameStorage.subscribeToPlayer(roomId, playerId, (player: Player | null) => {
      if (player) {
        setPlayerName(player.name);
        setIsAlive(player.isAlive);
        setPlayerRole(player.gameData?.role as ClocktowerRole || null);
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
      if (!roomId || !playerId || !isAlive) return;
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
    [roomId, playerId, playerName, isAlive]
  );

  const clearMessage = useCallback(() => {
    setPrivateMessage(null);
  }, []);

  return {
    privateMessage,
    waitingForStoryteller,
    hasSubmitted,
    hasNightAction,
    submitAction,
    clearMessage,
  };
}
