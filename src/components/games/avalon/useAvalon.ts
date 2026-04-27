'use client';

import { useCallback, useMemo } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import {
  AvalonRole,
  type AvalonGameState,
  type AvalonGameData,
  type AvalonQuestRecord,
  type AvalonRoomConfig,
  type TeamVote,
  type QuestCard,
} from './types';
import {
  ROLE_TEAM,
  TEAM_DISTRIBUTION,
  QUEST_TEAM_SIZES,
  questNeedsTwoFails,
  REQUIRED_ROLES,
  ALL_OPTIONAL_ROLES,
  PLAYER_COUNTS,
  type SupportedPlayerCount,
  VOTE_TRACK_LIMIT,
  QUESTS_TO_WIN,
} from './constants';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickNextLeader(
  allPlayers: Player[],
  used: string[]
): { leaderId: string; nextUsed: string[] } {
  const candidates = allPlayers.filter((p) => !used.includes(p.id));
  if (candidates.length === 0) {
    const pick = allPlayers[Math.floor(Math.random() * allPlayers.length)];
    return { leaderId: pick.id, nextUsed: [pick.id] };
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { leaderId: pick.id, nextUsed: [...used, pick.id] };
}

export function readState(room: Room): AvalonGameState | null {
  const gs = room.gameState as unknown as AvalonGameState | undefined;
  return gs && gs.phase ? gs : null;
}

export function readConfig(room: Room): AvalonRoomConfig {
  const cfg = room.config as Record<string, unknown>;
  const optionalRoles = (cfg.optionalRoles as AvalonRole[] | undefined) ?? [AvalonRole.Morgana];
  const useLadyOfLake = (cfg.useLadyOfLake as boolean | undefined) ?? false;
  return { optionalRoles, useLadyOfLake };
}

export function getPlayerData(player: Player | undefined): Partial<AvalonGameData> {
  return (player?.gameData as Partial<AvalonGameData>) ?? {};
}

function buildRolePool(playerCount: SupportedPlayerCount, optionalRoles: AvalonRole[]): AvalonRole[] {
  const dist = TEAM_DISTRIBUTION[playerCount];
  const pool: AvalonRole[] = [];

  pool.push(AvalonRole.Merlin);
  pool.push(AvalonRole.Assassin);
  pool.push(AvalonRole.Mordred);

  const goodOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'good');
  const evilOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'evil');

  const morganaIncluded = optionalRoles.includes(AvalonRole.Morgana);
  const morganaFitsEvil = evilOptional.indexOf(AvalonRole.Morgana) < dist.evil - 2;
  const percivalActive = morganaIncluded && morganaFitsEvil && dist.good - 1 >= 1;

  if (percivalActive) {
    pool.push(AvalonRole.Percival);
  }

  const goodSlotsLeft = dist.good - pool.filter((r) => ROLE_TEAM[r] === 'good').length;
  const evilSlotsLeft = dist.evil - pool.filter((r) => ROLE_TEAM[r] === 'evil').length;

  for (const r of goodOptional.slice(0, Math.max(0, goodSlotsLeft))) pool.push(r);
  for (const r of evilOptional.slice(0, Math.max(0, evilSlotsLeft))) pool.push(r);

  while (pool.filter((r) => ROLE_TEAM[r] === 'good').length < dist.good) {
    pool.push(AvalonRole.LoyalServant);
  }
  while (pool.filter((r) => ROLE_TEAM[r] === 'evil').length < dist.evil) {
    pool.push(AvalonRole.Minion);
  }

  if (pool.filter((r) => ROLE_TEAM[r] === 'good').length > dist.good ||
      pool.filter((r) => ROLE_TEAM[r] === 'evil').length > dist.evil) {
    throw new Error(
      `Số người chơi (${playerCount}) không đủ chỗ. Vui lòng kiểm tra cấu hình.`
    );
  }

  return shuffle(pool);
}

function emptyQuests(playerCount: SupportedPlayerCount): AvalonQuestRecord[] {
  const sizes = QUEST_TEAM_SIZES[playerCount];
  return sizes.map((teamSize) => ({
    result: null,
    failCount: 0,
    teamSize,
    leaderId: null,
    teamIds: [],
  }));
}

export function useAvalon(roomId: string | undefined, room: Room | null, players: Player[]) {
  const config = useMemo(() => (room ? readConfig(room) : null), [room]);
  const state = useMemo(() => (room ? readState(room) : null), [room]);

  const gamePlayers = useMemo(() => players, [players]);
  const playerCount = gamePlayers.length;
  const isSupportedCount = (PLAYER_COUNTS as readonly number[]).includes(playerCount);

  const currentQuestIdx = state?.currentQuest ?? 0;
  const requiredTeamSize = useMemo(() => {
    if (!state || !isSupportedCount) return 0;
    return QUEST_TEAM_SIZES[playerCount as SupportedPlayerCount][currentQuestIdx] ?? 0;
  }, [state, isSupportedCount, playerCount, currentQuestIdx]);

  const successCount = state?.quests.filter((q) => q.result === 'success').length ?? 0;
  const failCount = state?.quests.filter((q) => q.result === 'fail').length ?? 0;

  const writeState = useCallback(
    async (patch: Partial<AvalonGameState>) => {
      if (!roomId) return;
      await gameStorage.updateRoomGameState(roomId, patch as never);
    },
    [roomId]
  );

  const assignRoles = useCallback(async () => {
    if (!roomId || !room) return;
    if (!isSupportedCount) {
      throw new Error(`Avalon cần 5-10 người chơi (hiện ${playerCount}).`);
    }
    const cfg = readConfig(room);
    const pool = buildRolePool(playerCount as SupportedPlayerCount, cfg.optionalRoles);

    for (let i = 0; i < gamePlayers.length; i++) {
      const role = pool[i];
      const team = ROLE_TEAM[role];
      await gameStorage.updatePlayerGameData(roomId, gamePlayers[i].id, {
        role,
        team,
        questCard: null as unknown as QuestCard,
      });
    }

    const firstLeader = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];
    const ladyCandidates = gamePlayers.filter((p) => p.id !== firstLeader.id);
    const initialLady =
      playerCount >= 7 && ladyCandidates.length > 0
        ? ladyCandidates[Math.floor(Math.random() * ladyCandidates.length)]
        : null;

    const fresh: AvalonGameState = {
      rolesAssigned: true,
      phase: 'lineup-preview',
      currentQuest: 0,
      currentLeaderId: firstLeader.id,
      proposedTeam: [],
      voteRejectStreak: 0,
      quests: emptyQuests(playerCount as SupportedPlayerCount),
      teamVotes: {},
      questPlayedBy: [],
      ladyHolderId: initialLady ? initialLady.id : null,
      ladyHistory: [],
      ladyTargetId: null,
      merlinTargetId: null,
      winner: null,
      roleAcks: {},
      phaseStartedAt: Date.now(),
      roleLineup: pool.slice(),
      leadersUsed: [firstLeader.id],
      lastTeamVoteResult: null,
      ladyShownCard: null,
    };
    await writeState(fresh);
    await gameStorage.updateRoomStatus(roomId, 'night');
  }, [roomId, room, gamePlayers, playerCount, isSupportedCount, writeState]);

  const proceedToRoleReveal = useCallback(async () => {
    if (!roomId) return;
    await writeState({
      phase: 'role-reveal',
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
  }, [roomId, writeState]);

  const proceedToNightEvils = useCallback(async () => {
    if (!roomId) return;
    await writeState({
      phase: 'night-evils',
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
  }, [roomId, writeState]);

  const proceedToNightMerlin = useCallback(async () => {
    if (!roomId) return;
    await writeState({
      phase: 'night-merlin',
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
  }, [roomId, writeState]);

  const proceedToNightPercival = useCallback(async () => {
    if (!roomId) return;
    await writeState({
      phase: 'night-percival',
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
  }, [roomId, writeState]);

  const beginTeamBuild = useCallback(async () => {
    if (!roomId) return;
    await writeState({ phase: 'team-build', phaseStartedAt: Date.now() });
    await gameStorage.updateRoomStatus(roomId, 'day');
  }, [roomId, writeState]);

  const ackRole = useCallback(
    async (playerId: string) => {
      if (!roomId) return;
      const payload = { [`roleAcks.${playerId}`]: true };
      await gameStorage.updateRoomGameState(roomId, payload as never);
    },
    [roomId]
  );

  const setProposedTeam = useCallback(
    async (teamIds: string[]) => {
      await writeState({ proposedTeam: teamIds });
    },
    [writeState]
  );

  const submitTeam = useCallback(async () => {
    if (!roomId) return;
    await writeState({ phase: 'team-vote', teamVotes: {}, phaseStartedAt: Date.now() });
    await gameStorage.updateRoomStatus(roomId, 'voting');
  }, [roomId, writeState]);

  const castTeamVote = useCallback(
    async (playerId: string, vote: TeamVote) => {
      if (!roomId) return;
      const payload = { [`teamVotes.${playerId}`]: vote };
      await gameStorage.updateRoomGameState(roomId, payload as never);
    },
    [roomId]
  );

  const resolveTeamVote = useCallback(async () => {
    if (!roomId || !room || !state) return;
    if (state.phase !== 'team-vote') return;
    const votes = Object.values(state.teamVotes);
    const approves = votes.filter((v) => v === 'approve').length;
    const rejects = votes.filter((v) => v === 'reject').length;
    const approved = approves > rejects;

    if (approved) {
      const quest = { ...state.quests[state.currentQuest] };
      quest.leaderId = state.currentLeaderId;
      quest.teamIds = state.proposedTeam;
      const newQuests = [...state.quests];
      newQuests[state.currentQuest] = quest;
      await writeState({
        phase: 'team-vote-result',
        lastTeamVoteResult: 'approved',
        quests: newQuests,
        phaseStartedAt: Date.now(),
      });
    } else {
      const newStreak = state.voteRejectStreak + 1;
      if (newStreak >= VOTE_TRACK_LIMIT) {
        await writeState({
          voteRejectStreak: newStreak,
          phase: 'end',
          winner: 'evil',
          teamVotes: {},
          proposedTeam: [],
          lastTeamVoteResult: 'rejected',
        });
        await gameStorage.updateRoomStatus(roomId, 'end');
      } else {
        await writeState({
          phase: 'team-vote-result',
          lastTeamVoteResult: 'rejected',
          voteRejectStreak: newStreak,
          phaseStartedAt: Date.now(),
        });
      }
    }
  }, [roomId, room, state, writeState]);

  const proceedAfterTeamVoteResult = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'team-vote-result') return;

    if (state.lastTeamVoteResult === 'approved') {
      await writeState({
        phase: 'quest-play',
        voteRejectStreak: 0,
        questPlayedBy: [],
        phaseStartedAt: Date.now(),
      });
      for (const p of gamePlayers) {
        await gameStorage.updatePlayerGameData(roomId, p.id, {
          questCard: null as unknown as QuestCard,
        });
      }
      await gameStorage.updateRoomStatus(roomId, 'day');
    } else {
      const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
        gamePlayers,
        state.leadersUsed ?? []
      );
      await writeState({
        phase: 'team-build',
        currentLeaderId: nextLeaderId,
        leadersUsed: nextUsed,
        teamVotes: {},
        proposedTeam: [],
        phaseStartedAt: Date.now(),
      });
      await gameStorage.updateRoomStatus(roomId, 'day');
    }
  }, [roomId, state, gamePlayers, writeState]);

  const playQuestCard = useCallback(
    async (playerId: string, card: QuestCard) => {
      if (!roomId || !state) return;
      await gameStorage.updatePlayerGameData(roomId, playerId, { questCard: card });
      const next = state.questPlayedBy.includes(playerId)
        ? state.questPlayedBy
        : [...state.questPlayedBy, playerId];
      const payload = { [`questPlayedBy`]: next };
      await gameStorage.updateRoomGameState(roomId, payload as never);
    },
    [roomId, state]
  );

  const resolveQuest = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'quest-play') return;
    const teamIds = state.proposedTeam;
    const cards: QuestCard[] = teamIds.map((id) => {
      const p = players.find((pp) => pp.id === id);
      const card = (p?.gameData as Partial<AvalonGameData> | undefined)?.questCard;
      return card === 'fail' ? 'fail' : 'success';
    });
    const fails = cards.filter((c) => c === 'fail').length;
    const needTwo = questNeedsTwoFails(playerCount, state.currentQuest);
    const failed = needTwo ? fails >= 2 : fails >= 1;

    const newQuests = [...state.quests];
    newQuests[state.currentQuest] = {
      ...newQuests[state.currentQuest],
      result: failed ? 'fail' : 'success',
      failCount: fails,
    };

    await writeState({
      quests: newQuests,
      phase: 'quest-result',
      phaseStartedAt: Date.now(),
    });
  }, [roomId, state, players, playerCount, writeState]);

  const proceedAfterQuestResult = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'quest-result') return;

    const successes = state.quests.filter((q) => q.result === 'success').length;
    const failures = state.quests.filter((q) => q.result === 'fail').length;
    const allQuestsDone = state.quests.every((q) => q.result !== null);

    // Evil reaches 3 fails — game over, no need to continue
    if (failures >= QUESTS_TO_WIN) {
      await writeState({
        phase: 'end',
        winner: 'evil',
        proposedTeam: [],
        teamVotes: {},
        questPlayedBy: [],
      });
      await gameStorage.updateRoomStatus(roomId, 'end');
      return;
    }

    // After all 5 quests played, decide outcome based on Good's score
    if (allQuestsDone) {
      if (successes >= 4) {
        // Good wins outright (4-1 or 5-0) — no assassinate chance
        await writeState({
          phase: 'end',
          winner: 'good',
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
        });
        await gameStorage.updateRoomStatus(roomId, 'end');
        return;
      }
      if (successes === 3) {
        // Good 3-2 — assassinate phase
        await writeState({
          phase: 'assassinate',
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
          roleAcks: {},
          phaseStartedAt: Date.now(),
        });
        await gameStorage.updateRoomStatus(roomId, 'day');
        return;
      }
    }

    const justFinishedQuest = state.currentQuest;
    const ladyApplies =
      playerCount >= 7 &&
      state.ladyHolderId &&
      [1, 2, 3].includes(justFinishedQuest);

    const nextQuest = state.currentQuest + 1;
    const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
      gamePlayers,
      state.leadersUsed ?? []
    );

    if (ladyApplies) {
      await writeState({
        phase: 'lady-of-lake',
        proposedTeam: [],
        teamVotes: {},
        questPlayedBy: [],
        ladyTargetId: null,
        ladyShownCard: null,
        currentQuest: nextQuest,
        currentLeaderId: nextLeaderId,
        leadersUsed: nextUsed,
        phaseStartedAt: Date.now(),
      });
      await gameStorage.updateRoomStatus(roomId, 'day');
    } else {
      await writeState({
        phase: 'team-build',
        proposedTeam: [],
        teamVotes: {},
        questPlayedBy: [],
        currentQuest: nextQuest,
        currentLeaderId: nextLeaderId,
        leadersUsed: nextUsed,
        phaseStartedAt: Date.now(),
      });
      await gameStorage.updateRoomStatus(roomId, 'day');
    }
  }, [roomId, state, gamePlayers, playerCount, writeState]);

  const ladyInspect = useCallback(
    async (targetId: string) => {
      if (!roomId || !state) return;
      await writeState({ ladyTargetId: targetId, ladyShownCard: null });
    },
    [roomId, state, writeState]
  );

  const ladyShow = useCallback(
    async (card: 'good' | 'evil') => {
      if (!roomId) return;
      await writeState({ ladyShownCard: card });
    },
    [roomId, writeState]
  );

  const ladyFinish = useCallback(async () => {
    if (!roomId || !state || !state.ladyTargetId) return;
    const newHistory = [...state.ladyHistory, state.ladyHolderId!].filter(Boolean) as string[];
    await writeState({
      phase: 'team-build',
      ladyHolderId: state.ladyTargetId,
      ladyHistory: newHistory,
      ladyTargetId: null,
      ladyShownCard: null,
      phaseStartedAt: Date.now(),
    });
  }, [roomId, state, writeState]);

  const assassinate = useCallback(
    async (targetId: string) => {
      if (!roomId || !state) return;
      const target = players.find((p) => p.id === targetId);
      const role = (target?.gameData as Partial<AvalonGameData> | undefined)?.role;
      const winner = role === AvalonRole.Merlin ? 'evil' : 'good';
      await writeState({
        phase: 'end',
        merlinTargetId: targetId,
        winner,
      });
      await gameStorage.updateRoomStatus(roomId, 'end');
    },
    [roomId, state, players, writeState]
  );

  return {
    config,
    state,
    gamePlayers,
    playerCount,
    isSupportedCount,
    requiredTeamSize,
    successCount,
    failCount,
    assignRoles,
    proceedToRoleReveal,
    proceedToNightEvils,
    proceedToNightMerlin,
    proceedToNightPercival,
    beginTeamBuild,
    ackRole,
    setProposedTeam,
    submitTeam,
    castTeamVote,
    resolveTeamVote,
    proceedAfterTeamVoteResult,
    playQuestCard,
    resolveQuest,
    proceedAfterQuestResult,
    ladyInspect,
    ladyShow,
    ladyFinish,
    assassinate,
  };
}

export function defaultAvalonConfig(): AvalonRoomConfig {
  return {
    optionalRoles: [AvalonRole.Morgana],
    useLadyOfLake: false,
  };
}

export function validateOptionalRoles(roles: AvalonRole[]): AvalonRole[] {
  return roles.filter((r) => ALL_OPTIONAL_ROLES.includes(r));
}

export function listRequiredRoles(): AvalonRole[] {
  return REQUIRED_ROLES.slice();
}
