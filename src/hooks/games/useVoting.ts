'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { RoomGameState } from '@/types/room';

interface UseVotingReturn {
  nominations: Record<string, string | null>;
  votingTarget: string | null;
  votingTargetName: string | null;
  votes: Record<string, boolean>;
  hasVoted: boolean;
  voteCount: { agree: number; disagree: number; total: number };
  nominatePlayer: (targetId: string, targetName: string) => Promise<void>; // Host pushing to trial
  castNomination: (targetId: string | null) => Promise<void>; // Player nominating someone
  castVote: (vote: boolean) => Promise<void>;
  resolveVote: () => Promise<void>;
  cancelVote: () => Promise<void>;
}

/**
 * Hook for managing the voting/nomination system during the day phase.
 * Host nominates a player, all alive players vote, majority = execution.
 */
export function useVoting(
  roomId: string | undefined,
  playerId: string | null,
  gameState: RoomGameState | undefined,
  alivePlayers: number
): UseVotingReturn {
  const nominations = gameState?.nominations || {};
  const votingTarget = gameState?.votingTarget || null;
  const votingTargetName = gameState?.votingTargetName || null;
  const votes = gameState?.votes || {};

  const hasVoted = !!(playerId && votes[playerId] !== undefined);

  const voteCount = useMemo(() => {
    const entries = Object.values(votes);
    return {
      agree: entries.filter((v) => v === true).length,
      disagree: entries.filter((v) => v === false).length,
      total: entries.length,
    };
  }, [votes]);

  // ─── Host pushes a player to execution trial ─────────────────────────
  const nominatePlayer = useCallback(
    async (targetId: string, targetName: string) => {
      if (!roomId) return;
      await gameStorage.updateRoomGameState(roomId, {
        votingTarget: targetId,
        votingTargetName: targetName,
        votes: {},
      });
      await gameStorage.updateRoomStatus(roomId, 'voting');
    },
    [roomId]
  );

  // ─── Player nominates someone during the day ──────────────────────
  const castNomination = useCallback(
    async (targetId: string | null) => {
      if (!roomId || !playerId) return;
      
      // Use Firebase dot notation to update only this player's nomination
      // By using null, Firebase will store null or we can use deleteField() if we imported it.
      // Since it's a simple voting app, setting to null is fine.
      const payload = {
        [`nominations.${playerId}`]: targetId
      };
      
      await gameStorage.updateRoomGameState(roomId, payload as any);
    },
    [roomId, playerId]
  );

  // ─── Cast a vote ────────────────────────────────────────────────────
  const castVote = useCallback(
    async (vote: boolean) => {
      if (!roomId || !playerId) return;
      // Use dot notation to avoid overwriting other people's votes in a race condition
      const payload = {
        [`votes.${playerId}`]: vote
      };
      await gameStorage.updateRoomGameState(roomId, payload as any);
    },
    [roomId, playerId]
  );

  // ─── Resolve vote: if majority agree, execute the player ────────────
  const resolveVote = useCallback(async () => {
    if (!roomId || !votingTarget) return;
    const majority = Math.ceil(alivePlayers / 2);
    const agreeCount = Object.values(votes).filter((v) => v === true).length;

    if (agreeCount >= majority) {
      // Execute the player — they die
      await gameStorage.updatePlayerAlive(roomId, votingTarget, false);
    }

    // Clear voting state and return to day
    // Using null instead of undefined because Firebase updateDoc ignores undefined
    await gameStorage.updateRoomGameState(roomId, {
      votingTarget: null,
      votingTargetName: null,
      votes: {},
    } as any);
    await gameStorage.updateRoomStatus(roomId, 'day');
  }, [roomId, votingTarget, votes, alivePlayers]);

  // ─── Cancel vote without execution ──────────────────────────────────
  const cancelVote = useCallback(async () => {
    if (!roomId) return;
    await gameStorage.updateRoomGameState(roomId, {
      votingTarget: null,
      votingTargetName: null,
      votes: {},
    } as any);
    await gameStorage.updateRoomStatus(roomId, 'day');
  }, [roomId]);

  return {
    nominations,
    votingTarget,
    votingTargetName,
    votes,
    hasVoted,
    voteCount,
    nominatePlayer,
    castNomination,
    castVote,
    resolveVote,
    cancelVote,
  };
}
