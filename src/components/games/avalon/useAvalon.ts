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

// Leader đầu game được random, từ Q2 trở đi xoay theo CHIỀU KIM ĐỒNG HỒ
// (index tăng dần quanh bàn). Người ngồi cạnh phải Leader hiện tại làm Leader kế.
function pickNextLeader(
  allPlayers: Player[],
  currentLeaderId: string | null,
  used: string[]
): { leaderId: string; nextUsed: string[] } {
  const n = allPlayers.length;
  if (n === 0) {
    return { leaderId: '', nextUsed: used };
  }
  const currentIdx = currentLeaderId
    ? allPlayers.findIndex((p) => p.id === currentLeaderId)
    : -1;
  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % n : Math.floor(Math.random() * n);
  const pick = allPlayers[nextIdx];
  return {
    leaderId: pick.id,
    nextUsed: used.includes(pick.id) ? used : [...used, pick.id],
  };
}

export function readState(room: Room): AvalonGameState | null {
  const gs = room.gameState as unknown as AvalonGameState | undefined;
  return gs && gs.phase ? gs : null;
}

export function readConfig(room: Room): AvalonRoomConfig {
  const cfg = room.config as Record<string, unknown>;
  const optionalRoles = (cfg.optionalRoles as AvalonRole[] | undefined) ?? [];
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
  // Số slot evil còn trống sau Assassin + Mordred (đã push mặc định ở trên).
  const evilSlotsAfterCore = dist.evil - 2;
  const morganaFitsEvil = morganaIncluded && evilSlotsAfterCore >= 1;
  const percivalActive = morganaFitsEvil && dist.good - 1 >= 1;

  if (percivalActive) {
    pool.push(AvalonRole.Percival);
  }

  // Ưu tiên Morgana lên đầu danh sách evil optional để đảm bảo không bị Oberon
  // chiếm mất slot khi chỉ còn 1 chỗ trống (7-9 người).
  const evilOptionalOrdered = morganaFitsEvil
    ? [AvalonRole.Morgana, ...evilOptional.filter((r) => r !== AvalonRole.Morgana)]
    : evilOptional.filter((r) => r !== AvalonRole.Morgana);

  const goodSlotsLeft = dist.good - pool.filter((r) => ROLE_TEAM[r] === 'good').length;
  const evilSlotsLeft = dist.evil - pool.filter((r) => ROLE_TEAM[r] === 'evil').length;

  for (const r of goodOptional.slice(0, Math.max(0, goodSlotsLeft))) pool.push(r);
  for (const r of evilOptionalOrdered.slice(0, Math.max(0, evilSlotsLeft))) pool.push(r);

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

    // Atomic: dùng batch để tránh trường hợp mất mạng giữa chừng khiến chỉ
    // một phần player có role, phần còn lại không → game stuck "Đang chia bài".
    const roleUpdates = gamePlayers.map((p, i) => ({
      playerId: p.id,
      data: {
        role: pool[i],
        team: ROLE_TEAM[pool[i]],
        questCard: null,
      },
    }));
    await gameStorage.updatePlayersGameDataBatch(roomId, roleUpdates);

    // Leader đầu: random. Lady đầu: người ngồi BÊN TRÁI Leader đầu — vòng quanh
    // bàn xếp clockwise theo index 0..n-1, nên "bên trái" của index i = (i-1+n)%n.
    const firstLeaderIdx = Math.floor(Math.random() * gamePlayers.length);
    const firstLeader = gamePlayers[firstLeaderIdx];
    const ladyIdx = (firstLeaderIdx - 1 + gamePlayers.length) % gamePlayers.length;
    const initialLady = playerCount >= 7 ? gamePlayers[ladyIdx] : null;

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

  // Fallback khi Leader idle/disconnect quá 60s ở phase team-build:
  //   - Nếu proposedTeam đã đúng số lượng yêu cầu → auto-submit sang vote.
  //   - Nếu chưa đủ → bỏ qua Leader này, xoay sang Leader kế tiếp (clockwise),
  //     KHÔNG burn vote-reject-streak (vì chưa có vote nào diễn ra).
  const teamBuildTimeoutAdvance = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'team-build') return;
    const requiredSize =
      state.quests[state.currentQuest]?.teamSize ?? 0;
    if (state.proposedTeam.length === requiredSize && requiredSize > 0) {
      await writeState({
        phase: 'team-vote',
        teamVotes: {},
        phaseStartedAt: Date.now(),
      });
      await gameStorage.updateRoomStatus(roomId, 'voting');
    } else {
      const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
        gamePlayers,
        state.currentLeaderId,
        state.leadersUsed ?? []
      );
      await writeState({
        phase: 'team-build',
        currentLeaderId: nextLeaderId,
        leadersUsed: nextUsed,
        proposedTeam: [],
        teamVotes: {},
        phaseStartedAt: Date.now(),
      });
    }
  }, [roomId, state, gamePlayers, writeState]);

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
    // Bất kỳ player nào không bỏ phiếu trong 30s đều được tính là REJECT.
    // Vì vậy: rejects = totalPlayers - approves (kể cả khi vote sớm xong).
    // Chỉ tính vote của những player CÒN trong phòng tại thời điểm chốt — phòng
    // trường hợp player rời giữa phase nhưng vote cũ vẫn còn trong state.teamVotes.
    const activeIds = new Set(gamePlayers.map((p) => p.id));
    const totalPlayers = gamePlayers.length;
    const approves = Object.entries(state.teamVotes).filter(
      ([id, v]) => activeIds.has(id) && v === 'approve'
    ).length;
    const rejects = Math.max(0, totalPlayers - approves);
    const approved = totalPlayers > 0 && approves > rejects;

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
  }, [roomId, room, state, gamePlayers, writeState]);

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
      // Reset questCard cho tất cả player atomically — tránh trường hợp giữa
      // chừng có người vẫn còn 'fail' / 'success' từ quest trước.
      await gameStorage.updatePlayersGameDataBatch(
        roomId,
        gamePlayers.map((p) => ({
          playerId: p.id,
          data: { questCard: null },
        }))
      );
      await gameStorage.updateRoomStatus(roomId, 'day');
    } else {
      const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
        gamePlayers,
        state.currentLeaderId,
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
      if (!roomId) return;
      // Chỉ ghi questCard per-player. Source of truth cho "đã chơi" là
      // mỗi player.gameData.questCard, KHÔNG phải state.questPlayedBy.
      // (Trước đây đọc-rồi-ghi state.questPlayedBy gây race khi nhiều
      // người chơi nộp đồng thời, làm phase quest-play kẹt đến khi timeout.)
      await gameStorage.updatePlayerGameData(roomId, playerId, { questCard: card });
    },
    [roomId]
  );

  const resolveQuest = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'quest-play') return;
    const teamIds = state.proposedTeam;
    // Design choice: nếu một thành viên team không kịp chơi card trước timeout,
    // coi là 'success' (KHÔNG đếm fail). Chỉ những lá 'fail' thực sự được nộp
    // mới count vào fails — quest fail cần ≥1 (hoặc ≥2 cho quest 4 với 7+
    // người chơi). Hệ quả: Phe Quỷ idle/disconnect tự động mất cơ hội fail.
    let fails = 0;
    let missing = 0;
    for (const id of teamIds) {
      const p = players.find((pp) => pp.id === id);
      const card = (p?.gameData as Partial<AvalonGameData> | undefined)?.questCard;
      if (card === 'fail') fails += 1;
      else if (card !== 'success') missing += 1;
    }
    if (missing > 0 && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[avalon] quest ${state.currentQuest + 1}: ${missing} player(s) didn't play a card before timeout — counted as success.`);
    }
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

    // Decisive end-conditions kích hoạt NGAY khi đạt, không cần đợi đủ 5 quest:
    //   - ≥ 3 fail → Phe Quỷ thắng outright
    //   - ≥ 3 success → Sát Thủ LUÔN có cơ hội đâm Merlin (bất kể thứ tự
    //     win/fail, bất kể tỉ số 3-0/3-1/3-2). Phe Người chỉ thắng nếu Sát
    //     Thủ đoán sai hoặc hết giờ không chốt.
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
    if (successes >= QUESTS_TO_WIN) {
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

    const justFinishedQuest = state.currentQuest;
    const ladyApplies =
      playerCount >= 7 &&
      state.ladyHolderId &&
      [1, 2, 3].includes(justFinishedQuest);

    const nextQuest = state.currentQuest + 1;
    const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
      gamePlayers,
      state.currentLeaderId,
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
        phase: 'discussion',
        proposedTeam: [],
        teamVotes: {},
        questPlayedBy: [],
        currentQuest: nextQuest,
        currentLeaderId: nextLeaderId,
        leadersUsed: nextUsed,
        roleAcks: {},
        phaseStartedAt: Date.now(),
      });
      await gameStorage.updateRoomStatus(roomId, 'day');
    }
  }, [roomId, state, gamePlayers, playerCount, writeState]);

  const proceedAfterDiscussion = useCallback(async () => {
    if (!roomId || !state) return;
    if (state.phase !== 'discussion') return;
    await writeState({
      phase: 'team-build',
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
    await gameStorage.updateRoomStatus(roomId, 'day');
  }, [roomId, state, writeState]);

  const ackDiscussion = useCallback(
    async (playerId: string) => {
      if (!roomId) return;
      const payload = { [`roleAcks.${playerId}`]: true };
      await gameStorage.updateRoomGameState(roomId, payload as never);
    },
    [roomId]
  );

  // Bước 1: Lady chọn / đổi target. CHỈ set ladyTargetId, KHÔNG reveal phe.
  // Mọi đổi người đều RESET đồng hồ 45s để Lady có đủ thời gian cân nhắc.
  // Truyền chuỗi rỗng để CLEAR target (không dùng trong UI mới nhưng giữ).
  const ladyInspect = useCallback(
    async (targetId: string) => {
      if (!roomId || !state) return;
      await writeState({
        ladyTargetId: targetId || null,
        ladyShownCard: null,
        phaseStartedAt: Date.now(),
      });
    },
    [roomId, state, writeState]
  );

  // Bước 2: Lady bấm Xác nhận → tính phe thật của target và reveal cho Lady.
  const ladyConfirm = useCallback(async () => {
    if (!roomId || !state || !state.ladyTargetId) return;
    const target = players.find((p) => p.id === state.ladyTargetId);
    const team = (target?.gameData as Partial<AvalonGameData> | undefined)?.team;
    const trueCard: 'good' | 'evil' = team === 'evil' ? 'evil' : 'good';
    await writeState({ ladyShownCard: trueCard });
  }, [roomId, state, writeState, players]);

  const ladyShow = useCallback(
    async (_card: 'good' | 'evil') => {
      // No-op: target không còn quyền chọn lá; giữ hàm để khớp interface cũ.
      return;
    },
    []
  );

  const ladyFinish = useCallback(async () => {
    if (!roomId || !state || !state.ladyTargetId) return;
    const newHistory = [...state.ladyHistory, state.ladyHolderId!].filter(Boolean) as string[];
    await writeState({
      phase: 'discussion',
      ladyHolderId: state.ladyTargetId,
      ladyHistory: newHistory,
      ladyTargetId: null,
      ladyShownCard: null,
      roleAcks: {},
      phaseStartedAt: Date.now(),
    });
  }, [roomId, state, writeState]);

  // Fallback khi hết 45s. Lady chỉ thực sự "soi" khi đã CONFIRM (ladyShownCard
  // được set). Nếu CHƯA confirm → bỏ qua lượt soi, đồng thời RANDOM 1 Lady mới
  // từ những player chưa từng cầm token (loại current Lady và lịch sử).
  const ladyTimeoutAdvance = useCallback(async () => {
    if (!roomId || !state || state.phase !== 'lady-of-lake') return;
    const inspectionConfirmed = state.ladyShownCard !== null && !!state.ladyTargetId;
    if (inspectionConfirmed) {
      const newHistory = [...state.ladyHistory, state.ladyHolderId!].filter(Boolean) as string[];
      await writeState({
        phase: 'discussion',
        ladyHolderId: state.ladyTargetId,
        ladyHistory: newHistory,
        ladyTargetId: null,
        ladyShownCard: null,
        roleAcks: {},
        phaseStartedAt: Date.now(),
      });
    } else {
      const used = new Set(state.ladyHistory ?? []);
      if (state.ladyHolderId) used.add(state.ladyHolderId);
      const candidates = gamePlayers.filter((p) => !used.has(p.id));
      const fallback =
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)].id
          : state.ladyHolderId; // không còn ai → giữ nguyên holder
      const newHistory = state.ladyHolderId
        ? [...state.ladyHistory, state.ladyHolderId].filter(Boolean) as string[]
        : state.ladyHistory ?? [];
      await writeState({
        phase: 'discussion',
        ladyHolderId: fallback,
        ladyHistory: newHistory,
        ladyTargetId: null,
        ladyShownCard: null,
        roleAcks: {},
        phaseStartedAt: Date.now(),
      });
    }
  }, [roomId, state, gamePlayers, writeState]);

  const assassinate = useCallback(
    async (targetId: string, callerId?: string) => {
      if (!roomId || !state) return;
      // Guard phase: chỉ resolve được khi đang ở phase 'assassinate' (sau khi
      // Phe Người đã đủ 3 Quest). Ngoài phase này, request bị bỏ qua.
      if (state.phase !== 'assassinate') return;

      // Guard caller: chỉ Sát Thủ mới được đâm. Khi callerId không truyền (hoặc
      // không khớp), reject để tránh bypass UI.
      if (callerId) {
        const caller = players.find((p) => p.id === callerId);
        const callerRole = (caller?.gameData as Partial<AvalonGameData> | undefined)?.role;
        if (callerRole !== AvalonRole.Assassin) return;
      }

      // Guard target: target phải là một player còn trong phòng và thuộc Phe
      // Người. Nếu Sát Thủ "trỏ" vào đồng đội Phe Quỷ → reject (không hợp lệ
      // theo luật).
      const target = players.find((p) => p.id === targetId);
      if (!target) return;
      const targetData = target.gameData as Partial<AvalonGameData> | undefined;
      if (targetData?.team !== 'good') return;

      const winner = targetData.role === AvalonRole.Merlin ? 'evil' : 'good';
      await writeState({
        phase: 'end',
        merlinTargetId: targetId,
        winner,
      });
      await gameStorage.updateRoomStatus(roomId, 'end');
    },
    [roomId, state, players, writeState]
  );

  // Fallback: nếu Sát Thủ idle/disconnect, kết thúc với Phe Người thắng
  // (vì Phe Người đã đạt 3 Quest và không bị ám sát trúng).
  const assassinTimeoutAdvance = useCallback(async () => {
    if (!roomId || !state || state.phase !== 'assassinate') return;
    await writeState({
      phase: 'end',
      winner: 'good',
      merlinTargetId: null,
    });
    await gameStorage.updateRoomStatus(roomId, 'end');
  }, [roomId, state, writeState]);

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
    teamBuildTimeoutAdvance,
    castTeamVote,
    resolveTeamVote,
    proceedAfterTeamVoteResult,
    playQuestCard,
    resolveQuest,
    proceedAfterQuestResult,
    proceedAfterDiscussion,
    ackDiscussion,
    ladyInspect,
    ladyConfirm,
    ladyShow,
    ladyFinish,
    ladyTimeoutAdvance,
    assassinate,
    assassinTimeoutAdvance,
  };
}

export function defaultAvalonConfig(): AvalonRoomConfig {
  return {
    optionalRoles: [],
    useLadyOfLake: false,
  };
}

export function validateOptionalRoles(roles: AvalonRole[]): AvalonRole[] {
  return roles.filter((r) => ALL_OPTIONAL_ROLES.includes(r));
}

export function listRequiredRoles(): AvalonRole[] {
  return REQUIRED_ROLES.slice();
}
