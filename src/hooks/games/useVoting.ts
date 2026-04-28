'use client';

import { useCallback, useMemo } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { RoomGameState } from '@/types/room';

interface UseVotingReturn {
  nominations: Record<string, string | null>;
  votingTarget: string | null;
  votingTargetName: string | null;
  votes: Record<string, boolean>;
  voteTypes: Record<string, 'normal' | 'ghost'>;
  hasVoted: boolean;
  voteCount: { agree: number; disagree: number; total: number };
  nominatePlayer: (targetId: string, targetName: string) => Promise<void>;
  castNomination: (targetId: string | null) => Promise<void>;
  castVote: (vote: boolean) => Promise<void>;
  castGhostVote: (vote: boolean) => Promise<void>;
  resolveVote: (executedRole?: string) => Promise<void>;
  cancelVote: () => Promise<void>;
}

/**
 * Hook for managing the voting/nomination system during the day phase.
 * Supports normal votes (alive players) and ghost votes (dead players, once per game).
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
  const voteTypes = (gameState?.voteTypes || {}) as Record<string, 'normal' | 'ghost'>;

  const hasVoted = !!(playerId && votes[playerId] !== undefined);

  const voteCount = useMemo(() => {
    const entries = Object.values(votes);
    return {
      agree: entries.filter((v) => v === true).length,
      disagree: entries.filter((v) => v === false).length,
      total: entries.length,
    };
  }, [votes]);

  // ─── Host pushes a player to execution trial ──────────────────────
  const nominatePlayer = useCallback(
    async (targetId: string, targetName: string) => {
      if (!roomId) return;
      await gameStorage.updateRoomGameState(roomId, {
        votingTarget: targetId,
        votingTargetName: targetName,
        votes: {},
        voteTypes: {},
      });
      await gameStorage.updateRoomStatus(roomId, 'voting');
    },
    [roomId]
  );

  // ─── Player nominates someone during the day ───────────────────────
  const castNomination = useCallback(
    async (targetId: string | null) => {
      if (!roomId || !playerId) return;
      const payload = { [`nominations.${playerId}`]: targetId };
      await gameStorage.updateRoomGameState(roomId, payload as any);
    },
    [roomId, playerId]
  );

  // ─── Cast a normal vote (alive players) ───────────────────────────
  const castVote = useCallback(
    async (vote: boolean) => {
      if (!roomId || !playerId) return;
      const payload = {
        [`votes.${playerId}`]: vote,
        [`voteTypes.${playerId}`]: 'normal',
      };
      await gameStorage.updateRoomGameState(roomId, payload as any);
    },
    [roomId, playerId]
  );

  // ─── Cast a ghost vote (dead players, once per game) ──────────────
  const castGhostVote = useCallback(
    async (vote: boolean) => {
      if (!roomId || !playerId) return;
      const payload = {
        [`votes.${playerId}`]: vote,
        [`voteTypes.${playerId}`]: 'ghost',
      };
      await gameStorage.updateRoomGameState(roomId, payload as any);
      // Mark ghost vote as permanently spent on this player's record
      await gameStorage.updatePlayerGameData(roomId, playerId, { hasUsedGhostVote: true });
    },
    [roomId, playerId]
  );

  // ─── Resolve vote: if majority agree, execute the player ──────────
  const resolveVote = useCallback(
    async (executedRole?: string) => {
      if (!roomId || !votingTarget) return;
      const majority = Math.ceil(alivePlayers / 2);
      const agreeCount = Object.values(votes).filter((v) => v === true).length;
      const executed = agreeCount >= majority;

      if (executed) {
        await gameStorage.updatePlayerAlive(roomId, votingTarget, false);
      }

      await gameStorage.updateRoomGameState(roomId, {
        votingTarget: null,
        votingTargetName: null,
        votes: {},
        voteTypes: {},
        ...(executed && {
          lastExecutedPlayerId: votingTarget,
          lastExecutedRole: executedRole ?? null,
        }),
      } as any);
      await gameStorage.updateRoomStatus(roomId, 'day');
    },
    [roomId, votingTarget, votes, alivePlayers]
  );

  // ─── Cancel vote without execution ────────────────────────────────
  const cancelVote = useCallback(async () => {
    if (!roomId) return;
    await gameStorage.updateRoomGameState(roomId, {
      votingTarget: null,
      votingTargetName: null,
      votes: {},
      voteTypes: {},
    } as any);
    await gameStorage.updateRoomStatus(roomId, 'day');
  }, [roomId]);

  return {
    nominations,
    votingTarget,
    votingTargetName,
    votes,
    voteTypes,
    hasVoted,
    voteCount,
    nominatePlayer,
    castNomination,
    castVote,
    castGhostVote,
    resolveVote,
    cancelVote,
  };
}
