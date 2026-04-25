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
  displayRole: ClocktowerRole | null; // Fake role for Drunk, actual role otherwise
  isDrunk: boolean;
  submitAction: (
    targetId?: string,
    targetName?: string,
    secondTargetId?: string,
    secondTargetName?: string
  ) => Promise<void>;
  clearMessage: () => void;
}

/**
 * Player-side hook for Clocktower Night Phase.
 * - Returns displayRole: the Drunk sees their fake (drunkRole) Townsfolk identity.
 * - hasNightAction is computed from displayRole so Drunk acts as their fake role.
 * - submitAction supports a second target for Fortune Teller.
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
  const [drunkRole, setDrunkRole] = useState<ClocktowerRole | null>(null);
  const [isDrunk, setIsDrunk] = useState(false);

  // The role shown to the player (fake role for Drunk)
  const displayRole = isDrunk && drunkRole ? drunkRole : playerRole;

  // Night action eligibility is based on what the player believes their role is
  const hasNightAction = displayRole
    ? dayCount === 0
      ? FIRST_NIGHT_ROLES.includes(displayRole)
      : OTHER_NIGHT_ROLES.includes(displayRole)
    : false;

  useEffect(() => {
    if (!roomId || !playerId) return;
    const unsub = gameStorage.subscribeToPlayer(roomId, playerId, (player: Player | null) => {
      if (player) {
        setPlayerName(player.name);
        setIsAlive(player.isAlive);

        const role = player.gameData?.role as ClocktowerRole | null;
        const drunk = player.gameData?.isDrunk === true;
        const fake = player.gameData?.drunkRole as ClocktowerRole | null;

        setPlayerRole(role);
        setIsDrunk(drunk);
        setDrunkRole(fake ?? null);

        const msg = player.gameData?.privateMessage;
        if (msg && typeof msg === 'string') {
          setPrivateMessage(msg);
          setWaitingForStoryteller(false);
        }
      }
    });
    return () => unsub();
  }, [roomId, playerId]);

  // Reset submission state each new night (dayCount changes)
  useEffect(() => {
    setHasSubmitted(false);
    setWaitingForStoryteller(false);
  }, [dayCount]);

  const submitAction = useCallback(
    async (
      targetId?: string,
      targetName?: string,
      secondTargetId?: string,
      secondTargetName?: string
    ) => {
      if (!roomId || !playerId || !isAlive) return;
      const payload: SubmitActionPayload = {
        playerId,
        playerName,
        actionType: 'ability',
        ...(targetId && { targetId }),
        ...(targetName && { targetName }),
        ...(secondTargetId && { secondTargetId }),
        ...(secondTargetName && { secondTargetName }),
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
    displayRole,
    isDrunk,
    submitAction,
    clearMessage,
  };
}
