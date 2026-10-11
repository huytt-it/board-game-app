'use client';

import { useCallback, useMemo } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import { serverNow } from '@/lib/serverClock';
import type { BaseGameData, Player } from '@/types/player';
import type { Room, RoomStatus } from '@/types/room';
import {
  AvalonRole,
  PHASE_SECONDS_LIMITS,
  TIMED_PHASES,
  phaseTimeoutMs,
  type AvalonPhase,
  type AvalonGameState,
  type AvalonGameData,
  type AvalonQuestRecord,
  type AvalonRoomConfig,
  type LadyEvent,
  type LadyTimeoutMode,
  type TeamVote,
  type QuestCard,
  type TimedPhase,
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
//
// Quan trọng: rotation BẮT BUỘC dựa trên seatOrder (thứ tự ghế trên bàn) —
// KHÔNG dựa trên array Player[] runtime, vì runtime array có thể bị thay đổi
// thứ tự (ví dụ player rejoin được append cuối) khiến "+1 index" nhảy lung
// tung không đúng kế bên trên bàn. Skip ghế của player đã rời phòng.
function pickNextLeader(
  seatOrder: string[],
  presentIds: string[],
  currentLeaderId: string | null,
  used: string[]
): { leaderId: string; nextUsed: string[] } {
  const seatIds = seatOrder.length > 0 ? seatOrder : presentIds;
  const n = seatIds.length;
  if (n === 0) {
    return { leaderId: currentLeaderId ?? '', nextUsed: used };
  }
  const present = new Set(presentIds);
  const startIdx = currentLeaderId ? seatIds.findIndex((id) => id === currentLeaderId) : -1;
  // Khi chưa có currentLeader → random một ghế trong số ghế còn người.
  if (startIdx < 0) {
    const candidates = seatIds.filter((id) => present.has(id));
    if (candidates.length === 0) return { leaderId: '', nextUsed: used };
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      leaderId: id,
      nextUsed: used.includes(id) ? used : [...used, id],
    };
  }
  // Quay clockwise từ ghế hiện tại, trả về player đầu tiên còn trong phòng.
  for (let step = 1; step <= n; step++) {
    const idx = (startIdx + step) % n;
    const id = seatIds[idx];
    if (present.has(id)) {
      return {
        leaderId: id,
        nextUsed: used.includes(id) ? used : [...used, id],
      };
    }
  }
  return { leaderId: currentLeaderId ?? '', nextUsed: used };
}

export function readState(room: Room): AvalonGameState | null {
  const gs = room.gameState as unknown as AvalonGameState | undefined;
  return gs && gs.phase ? gs : null;
}

export function readConfig(room: Room): AvalonRoomConfig & {
  phaseSeconds: Record<TimedPhase, number>;
  ladyTimeoutMode: LadyTimeoutMode;
} {
  const cfg = room.config as Record<string, unknown>;
  const optionalRoles = (cfg.optionalRoles as AvalonRole[] | undefined) ?? [];
  const useLadyOfLake = (cfg.useLadyOfLake as boolean | undefined) ?? false;
  const phaseSeconds = readPhaseSeconds(cfg.phaseSeconds);
  const ladyTimeoutMode = LADY_TIMEOUT_MODES.includes(cfg.ladyTimeoutMode as LadyTimeoutMode)
    ? (cfg.ladyTimeoutMode as LadyTimeoutMode)
    : 'skip';
  return { optionalRoles, useLadyOfLake, phaseSeconds, ladyTimeoutMode };
}

const LADY_TIMEOUT_MODES: readonly LadyTimeoutMode[] = ['skip', 'random', 'wait'];

// Seconds per adjustable phase from the room's settings (GĐ8). A number is
// snapped to the settings' step and clamped to the limits; anything else (a
// missing field in an older room, garbage) is the default.
function readPhaseSeconds(raw: unknown): Record<TimedPhase, number> {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<TimedPhase, number>;
  for (const phase of TIMED_PHASES) {
    const { min, max, step, def } = PHASE_SECONDS_LIMITS[phase];
    const v = src[phase];
    out[phase] =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.min(max, Math.max(min, min + Math.round((v - min) / step) * step))
        : def;
  }
  return out;
}

// ── Lady of the Lake: how her turn ends (GĐ8) ───────────────────────────
// Every way out of lady-of-lake writes `ladyLastEvent` so every screen can say
// it: who held her, whom she looked at and how, who holds her now. It is
// public and carries no team — the team seen stays in ladyShownCard.

/** The holder's time to see a card the game turned over for her. */
const LADY_VIEW_MS = 10_000;

function ladyEvent(s: AvalonGameState, how: LadyEvent['how'], targetId: string | null, newHolderId: string): LadyEvent {
  // currentQuest already points at the next quest during the Lady's turn.
  return { quest: s.currentQuest - 1, holderId: s.ladyHolderId ?? '', targetId, how, newHolderId };
}

// An event this turn already wrote for the current target while staying in the
// phase: the game's own look ('random') or the 'wait' grace ('inspected').
function ladyMark(s: AvalonGameState): LadyEvent | null {
  const e = s.ladyLastEvent;
  return e && e.quest === s.currentQuest - 1 && e.targetId === s.ladyTargetId ? e : null;
}

// Moves the phase clock so that exactly LADY_VIEW_MS are left. On purpose: the
// holder gets that long to see the card, then the next timeout hands the Lady
// on through the "she has looked" branch.
function ladyViewClock(s: AvalonGameState): number {
  return serverNow() - (phaseTimeoutMs(s, 'lady-of-lake') - LADY_VIEW_MS);
}

/** She has looked: the token goes to the player she inspected. */
function ladyPassPatch(s: AvalonGameState): Partial<AvalonGameState> {
  const newHistory = [...s.ladyHistory, s.ladyHolderId!].filter(Boolean) as string[];
  return {
    phase: 'discussion',
    ladyHolderId: s.ladyTargetId,
    ladyHistory: newHistory,
    ladyTargetId: null,
    ladyShownCard: null,
    roleAcks: {},
    ladyLastEvent: ladyEvent(s, ladyMark(s)?.how ?? 'inspected', s.ladyTargetId, s.ladyTargetId ?? ''),
  };
}

/** No look: the token goes to a random player who never held it. */
function ladySkipPatch(s: AvalonGameState, present: Player[]): Partial<AvalonGameState> {
  const used = new Set(s.ladyHistory ?? []);
  if (s.ladyHolderId) used.add(s.ladyHolderId);
  const candidates = present.filter((p) => !used.has(p.id));
  const fallback =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)].id
      : s.ladyHolderId; // không còn ai → giữ nguyên holder
  const newHistory = s.ladyHolderId
    ? [...s.ladyHistory, s.ladyHolderId].filter(Boolean) as string[]
    : s.ladyHistory ?? [];
  return {
    phase: 'discussion',
    ladyHolderId: fallback,
    ladyHistory: newHistory,
    ladyTargetId: null,
    ladyShownCard: null,
    roleAcks: {},
    ladyLastEvent: ladyEvent(s, 'skipped', null, fallback ?? ''),
  };
}

/** The game looks for her: at the player she aims at, else a random valid one
 *  (never held the Lady, not the holder), with the TRUE team (as ladyConfirm).
 *  Stays in the phase. Null when there is nobody to look at. */
function ladyRandomPatch(s: AvalonGameState, present: Player[], everyone: Player[]): Partial<AvalonGameState> | null {
  const used = new Set(s.ladyHistory ?? []);
  if (s.ladyHolderId) used.add(s.ladyHolderId);
  const valid = present.filter((p) => !used.has(p.id));
  const targetId = s.ladyTargetId ?? (valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)].id : null);
  if (!targetId) return null;
  const team = (everyone.find((p) => p.id === targetId)?.gameData as Partial<AvalonGameData> | undefined)?.team;
  return {
    ladyTargetId: targetId,
    ladyShownCard: team === 'evil' ? 'evil' : 'good',
    phaseStartedAt: ladyViewClock(s),
    ladyLastEvent: ladyEvent(s, 'random', targetId, targetId),
  };
}

/** The phase durations a new game fixes, in ms (state.timeouts). */
function timeoutsFor(phaseSeconds: Record<TimedPhase, number>): Partial<Record<AvalonPhase, number>> {
  return Object.fromEntries(TIMED_PHASES.map((p) => [p, phaseSeconds[p] * 1000]));
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

  const gamePlayers = useMemo(() => {
    const seatOrder = state?.seatOrder;
    if (!seatOrder || seatOrder.length === 0) return players;
    const byId = new Map(players.map((p) => [p.id, p]));
    const seated: Player[] = [];
    for (const id of seatOrder) {
      const p = byId.get(id);
      if (p) seated.push(p);
    }
    const seenIds = new Set(seatOrder);
    for (const p of players) {
      if (!seenIds.has(p.id)) seated.push(p);
    }
    return seated;
  }, [players, state]);
  // Seats are fixed when the game starts. Rules that depend on the table size
  // (quest sizes, Quest 4 needing 2 fails, Lady) must not change because someone's
  // record disappears mid-game, so they use the seat count. Voting and acks count
  // only the players still present (gamePlayers).
  const seatCount = state?.seatOrder?.length ?? 0;
  const playerCount = seatCount > 0 ? seatCount : gamePlayers.length;
  const isSupportedCount = (PLAYER_COUNTS as readonly number[]).includes(playerCount);

  const currentQuestIdx = state?.currentQuest ?? 0;
  const requiredTeamSize = useMemo(() => {
    if (!state || !isSupportedCount) return 0;
    return QUEST_TEAM_SIZES[playerCount as SupportedPlayerCount][currentQuestIdx] ?? 0;
  }, [state, isSupportedCount, playerCount, currentQuestIdx]);

  const successCount = state?.quests.filter((q) => q.result === 'success').length ?? 0;
  const failCount = state?.quests.filter((q) => q.result === 'fail').length ?? 0;

  // Every phase change goes through here. It only applies if the room is still in
  // the phase THIS client is looking at (phase + phaseStartedAt), so a stale
  // client (asleep, offline, slow) or a second client racing us can't overwrite
  // newer state. Resolves false when someone else already moved on; throws when
  // offline (nothing is queued for later).
  //
  // A decision that rests on data which can still change inside the phase (votes,
  // the proposed team, quest cards) must say so via `expect` / `expectPlayerData`:
  // the phase token alone can't tell that this client's copy of that data is stale.
  const advance = useCallback(
    async (
      patch: Partial<AvalonGameState>,
      opts?: {
        status?: RoomStatus;
        playerData?: Array<{ playerId: string; data: Partial<BaseGameData> }>;
        expect?: Record<string, unknown>;
        expectPlayerData?: Array<{ playerId: string; data: Partial<BaseGameData> }>;
      }
    ) => {
      if (!roomId || !state) return false;
      const { expect, ...rest } = opts ?? {};
      return gameStorage.casGameState(
        roomId,
        { phase: state.phase, phaseStartedAt: state.phaseStartedAt, ...expect },
        { phaseStartedAt: serverNow(), ...patch },
        rest
      );
    },
    [roomId, state]
  );

  // Changes inside a phase (votes, acks, picks) are dropped the same way if that
  // phase has already ended, instead of landing in a later one.
  const updateInPhase = useCallback(
    async (
      phase: AvalonPhase,
      patch: Record<string, unknown>,
      playerData?: Array<{ playerId: string; data: Partial<BaseGameData> }>
    ) => {
      if (!roomId) return false;
      return gameStorage.casGameState(roomId, { phase }, patch, { playerData });
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

    // Random hoá vị trí ngồi mỗi ván — lấy từ raw `players` để không bị ảnh
    // hưởng bởi seatOrder cũ (nếu có) còn sót lại trong state.
    const seatOrder = shuffle(players.map((p) => p.id));
    const seatedPlayers = seatOrder
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));

    // Atomic: dùng batch để tránh trường hợp mất mạng giữa chừng khiến chỉ
    // một phần player có role, phần còn lại không → game stuck "Đang chia bài".
    const roleUpdates = seatedPlayers.map((p, i) => ({
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
    const firstLeaderIdx = Math.floor(Math.random() * seatedPlayers.length);
    const firstLeader = seatedPlayers[firstLeaderIdx];
    const ladyIdx = (firstLeaderIdx - 1 + seatedPlayers.length) % seatedPlayers.length;
    const initialLady = playerCount >= 7 ? seatedPlayers[ladyIdx] : null;

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
      phaseStartedAt: serverNow(),
      roleLineup: pool.slice(),
      leadersUsed: [firstLeader.id],
      lastTeamVoteResult: null,
      ladyShownCard: null,
      seatOrder,
      assassinChoiceId: null,
      // The host's settings are fixed for the whole game here: changing them
      // later (next lobby) never touches a game already running.
      timeouts: timeoutsFor(cfg.phaseSeconds),
      ladyTimeoutMode: cfg.ladyTimeoutMode,
      ladyLastEvent: null,
    };
    await gameStorage.updateRoomGameState(roomId, fresh as never);
    await gameStorage.updateRoomStatus(roomId, 'night');
  }, [roomId, room, players, playerCount, isSupportedCount]);

  const proceedToRoleReveal = useCallback(
    () => advance({ phase: 'role-reveal', roleAcks: {} }),
    [advance]
  );

  const proceedToNightEvils = useCallback(
    () => advance({ phase: 'night-evils', roleAcks: {} }),
    [advance]
  );

  const proceedToNightMerlin = useCallback(
    () => advance({ phase: 'night-merlin', roleAcks: {} }),
    [advance]
  );

  const proceedToNightPercival = useCallback(
    () => advance({ phase: 'night-percival', roleAcks: {} }),
    [advance]
  );

  const beginTeamBuild = useCallback(
    () => advance({ phase: 'team-build' }, { status: 'day' }),
    [advance]
  );

  const ackRole = useCallback(
    async (playerId: string) => {
      if (!state) return;
      await updateInPhase(state.phase, { [`roleAcks.${playerId}`]: true });
    },
    [state, updateInPhase]
  );

  const setProposedTeam = useCallback(
    async (teamIds: string[]) => {
      await updateInPhase('team-build', { proposedTeam: teamIds });
    },
    [updateInPhase]
  );

  const submitTeam = useCallback(
    () => advance({ phase: 'team-vote', teamVotes: {} }, { status: 'voting' }),
    [advance]
  );

  // Fallback khi Leader idle/disconnect quá 60s ở phase team-build:
  //   - Nếu proposedTeam đã đúng số lượng yêu cầu → auto-submit sang vote.
  //   - Nếu chưa đủ → bỏ qua Leader này, xoay sang Leader kế tiếp (clockwise),
  //     KHÔNG burn vote-reject-streak (vì chưa có vote nào diễn ra).
  const teamBuildTimeoutAdvance = useCallback(async () => {
    if (!state || state.phase !== 'team-build') return;
    const requiredSize =
      state.quests[state.currentQuest]?.teamSize ?? 0;
    const expect = { proposedTeam: state.proposedTeam };
    if (state.proposedTeam.length === requiredSize && requiredSize > 0) {
      await advance({ phase: 'team-vote', teamVotes: {} }, { status: 'voting', expect });
    } else {
      const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
        state.seatOrder ?? gamePlayers.map((p) => p.id),
        gamePlayers.map((p) => p.id),
        state.currentLeaderId,
        state.leadersUsed ?? []
      );
      await advance(
        {
          phase: 'team-build',
          currentLeaderId: nextLeaderId,
          leadersUsed: nextUsed,
          proposedTeam: [],
          teamVotes: {},
        },
        { expect }
      );
    }
  }, [state, gamePlayers, advance]);

  const castTeamVote = useCallback(
    async (playerId: string, vote: TeamVote) => {
      await updateInPhase('team-vote', { [`teamVotes.${playerId}`]: vote });
    },
    [updateInPhase]
  );

  const resolveTeamVote = useCallback(async () => {
    if (!state || state.phase !== 'team-vote') return;
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
    // The tally must be checked against the votes actually stored, not just this
    // client's copy: a client with a stale view would otherwise reverse the result.
    const expect = { teamVotes: state.teamVotes, proposedTeam: state.proposedTeam };

    if (approved) {
      const quest = { ...state.quests[state.currentQuest] };
      quest.leaderId = state.currentLeaderId;
      quest.teamIds = state.proposedTeam;
      quest.approveCount = approves;
      quest.rejectCount = rejects;
      const newQuests = [...state.quests];
      newQuests[state.currentQuest] = quest;
      await advance(
        {
          phase: 'team-vote-result',
          lastTeamVoteResult: 'approved',
          quests: newQuests,
        },
        { expect }
      );
    } else {
      const newStreak = state.voteRejectStreak + 1;
      if (newStreak >= VOTE_TRACK_LIMIT) {
        await advance(
          {
            voteRejectStreak: newStreak,
            phase: 'end',
            winner: 'evil',
            teamVotes: {},
            proposedTeam: [],
            lastTeamVoteResult: 'rejected',
          },
          { status: 'end', expect }
        );
      } else {
        await advance(
          {
            phase: 'team-vote-result',
            lastTeamVoteResult: 'rejected',
            voteRejectStreak: newStreak,
          },
          { expect }
        );
      }
    }
  }, [state, gamePlayers, advance]);

  const proceedAfterTeamVoteResult = useCallback(async () => {
    if (!state || state.phase !== 'team-vote-result') return;

    if (state.lastTeamVoteResult === 'approved') {
      // questCard của mọi người được reset TRONG CÙNG transaction với việc đổi
      // phase sang 'quest-play', nên không có khoảng hở nào mà client thấy
      // phase='quest-play' nhưng questCard vẫn còn lá của quest trước (sẽ khoá
      // UI chọn lá của thành viên team mới và làm auto-resolve chốt quest
      // ngay bằng các lá cũ).
      await advance(
        { phase: 'quest-play', voteRejectStreak: 0, questPlayedBy: [] },
        {
          status: 'day',
          playerData: gamePlayers.map((p) => ({ playerId: p.id, data: { questCard: null } })),
        }
      );
    } else {
      const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
        state.seatOrder ?? gamePlayers.map((p) => p.id),
        gamePlayers.map((p) => p.id),
        state.currentLeaderId,
        state.leadersUsed ?? []
      );
      await advance(
        {
          phase: 'team-build',
          currentLeaderId: nextLeaderId,
          leadersUsed: nextUsed,
          teamVotes: {},
          proposedTeam: [],
        },
        { status: 'day' }
      );
    }
  }, [state, gamePlayers, advance]);

  const playQuestCard = useCallback(
    async (playerId: string, card: QuestCard) => {
      // Chỉ ghi questCard per-player. Source of truth cho "đã chơi" là
      // mỗi player.gameData.questCard, KHÔNG phải state.questPlayedBy.
      // Chỉ nhận khi phase vẫn là 'quest-play' — một lá bài gửi muộn sẽ không
      // rơi vào quest kế tiếp.
      await updateInPhase('quest-play', {}, [{ playerId, data: { questCard: card } }]);
    },
    [updateInPhase]
  );

  const resolveQuest = useCallback(async () => {
    if (!state || state.phase !== 'quest-play') return;
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

    // Same rule as the vote: the count of fails must match the cards actually stored.
    const expectPlayerData = teamIds.map((id) => ({
      playerId: id,
      data: {
        questCard:
          (players.find((pp) => pp.id === id)?.gameData as Partial<AvalonGameData> | undefined)
            ?.questCard ?? null,
      },
    }));
    await advance({ quests: newQuests, phase: 'quest-result' }, { expectPlayerData });
  }, [state, players, playerCount, advance]);

  const proceedAfterQuestResult = useCallback(async () => {
    if (!state || state.phase !== 'quest-result') return;

    const successes = state.quests.filter((q) => q.result === 'success').length;
    const failures = state.quests.filter((q) => q.result === 'fail').length;

    // Decisive end-conditions kích hoạt NGAY khi đạt, không cần đợi đủ 5 quest:
    //   - ≥ 3 fail → Phe Quỷ thắng outright
    //   - ≥ 3 success → Sát Thủ LUÔN có cơ hội đâm Merlin (bất kể thứ tự
    //     win/fail, bất kể tỉ số 3-0/3-1/3-2). Phe Người chỉ thắng nếu Sát
    //     Thủ đoán sai hoặc hết giờ không chốt.
    if (failures >= QUESTS_TO_WIN) {
      await advance(
        { phase: 'end', winner: 'evil', proposedTeam: [], teamVotes: {}, questPlayedBy: [] },
        { status: 'end' }
      );
      return;
    }
    if (successes >= QUESTS_TO_WIN) {
      await advance(
        {
          phase: 'assassinate',
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
          roleAcks: {},
        },
        { status: 'day' }
      );
      return;
    }

    const justFinishedQuest = state.currentQuest;
    const ladyApplies =
      playerCount >= 7 &&
      state.ladyHolderId &&
      [1, 2, 3].includes(justFinishedQuest);

    const nextQuest = state.currentQuest + 1;
    const { leaderId: nextLeaderId, nextUsed } = pickNextLeader(
      state.seatOrder ?? gamePlayers.map((p) => p.id),
      gamePlayers.map((p) => p.id),
      state.currentLeaderId,
      state.leadersUsed ?? []
    );

    if (ladyApplies) {
      await advance(
        {
          phase: 'lady-of-lake',
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
          ladyTargetId: null,
          ladyShownCard: null,
          currentQuest: nextQuest,
          currentLeaderId: nextLeaderId,
          leadersUsed: nextUsed,
        },
        { status: 'day' }
      );
    } else {
      await advance(
        {
          phase: 'discussion',
          proposedTeam: [],
          teamVotes: {},
          questPlayedBy: [],
          currentQuest: nextQuest,
          currentLeaderId: nextLeaderId,
          leadersUsed: nextUsed,
          roleAcks: {},
        },
        { status: 'day' }
      );
    }
  }, [state, gamePlayers, playerCount, advance]);

  const proceedAfterDiscussion = useCallback(async () => {
    if (!state || state.phase !== 'discussion') return;
    await advance({ phase: 'team-build', roleAcks: {} }, { status: 'day' });
  }, [state, advance]);

  const ackDiscussion = useCallback(
    async (playerId: string) => {
      await updateInPhase('discussion', { [`roleAcks.${playerId}`]: true });
    },
    [updateInPhase]
  );

  // Bước 1: Lady chọn / đổi target. CHỈ set ladyTargetId, KHÔNG reveal phe.
  // Mọi đổi người đều RESET đồng hồ 45s để Lady có đủ thời gian cân nhắc.
  // Truyền chuỗi rỗng để CLEAR target (không dùng trong UI mới nhưng giữ).
  const ladyInspect = useCallback(
    async (targetId: string) => {
      await updateInPhase('lady-of-lake', {
        ladyTargetId: targetId || null,
        ladyShownCard: null,
        phaseStartedAt: serverNow(),
      });
    },
    [updateInPhase]
  );

  // Bước 2: Lady bấm Xác nhận → tính phe thật của target và reveal cho Lady.
  const ladyConfirm = useCallback(async () => {
    if (!state || !state.ladyTargetId) return;
    const target = players.find((p) => p.id === state.ladyTargetId);
    const team = (target?.gameData as Partial<AvalonGameData> | undefined)?.team;
    const trueCard: 'good' | 'evil' = team === 'evil' ? 'evil' : 'good';
    await updateInPhase('lady-of-lake', { ladyShownCard: trueCard });
  }, [state, updateInPhase, players]);

  const ladyShow = useCallback(
    async (_card: 'good' | 'evil') => {
      // No-op: target không còn quyền chọn lá; giữ hàm để khớp interface cũ.
      return;
    },
    []
  );

  // "Hoàn tất": the holder hands the Lady to the player she inspected (writes
  // ladyLastEvent: 'inspected', or 'random' if the game looked for her).
  const ladyFinish = useCallback(async () => {
    if (!state || !state.ladyTargetId) return;
    await advance(ladyPassPatch(state));
  }, [state, advance]);

  // The Lady's time is up (ladyTimeoutMode, fixed when the game started; an
  // older game has none = 'skip'). She has looked (ladyShownCard set) → the
  // token goes to the player she inspected. She has not:
  //   - 'skip': no look; RANDOM new Lady among players who never held her
  //     (loại current Lady và lịch sử) — the behaviour before GĐ8;
  //   - 'random': the game looks for her and stays in the phase for
  //     LADY_VIEW_MS (ladyRandomPatch); the next timeout hands the Lady on;
  //   - 'wait': nothing is written — the game waits for her, or for the host
  //     (ladyForceSkip / ladyForceRandom).
  const ladyTimeoutAdvance = useCallback(async () => {
    if (!state || state.phase !== 'lady-of-lake') return;
    const mode = state.ladyTimeoutMode ?? 'skip';
    const inspectionConfirmed = state.ladyShownCard !== null && !!state.ladyTargetId;
    const expect = { ladyTargetId: state.ladyTargetId, ladyShownCard: state.ladyShownCard };
    if (inspectionConfirmed) {
      if (mode === 'wait' && !ladyMark(state)) {
        // 'wait': she may have looked only after her time was up, so the
        // timeout comes at once — first give her LADY_VIEW_MS to see the card
        // (once: the event written now marks it), as for the game's own look.
        await advance(
          { phaseStartedAt: ladyViewClock(state), ladyLastEvent: ladyEvent(state, 'inspected', state.ladyTargetId, state.ladyTargetId ?? '') },
          { expect }
        );
        return;
      }
      await advance(ladyPassPatch(state), { expect });
      return;
    }
    if (mode === 'wait') return;
    const lookForHer = mode === 'random' ? ladyRandomPatch(state, gamePlayers, players) : null;
    await advance(lookForHer ?? ladySkipPatch(state, gamePlayers), { expect });
  }, [state, gamePlayers, players, advance]);

  // The host's two answers to a 'wait' nobody resolves (the holder is away):
  // the same branches the other modes take on their own. Only once her time
  // is up on the server clock, and only before she has looked. The UI offers
  // them to the host only (same trust as every other action).
  const ladyForce = useCallback(
    async (how: 'skip' | 'random') => {
      if (!state || state.phase !== 'lady-of-lake' || state.ladyShownCard !== null) return;
      if (serverNow() - state.phaseStartedAt < phaseTimeoutMs(state)) return;
      const expect = { ladyTargetId: state.ladyTargetId, ladyShownCard: state.ladyShownCard };
      const lookForHer = how === 'random' ? ladyRandomPatch(state, gamePlayers, players) : null;
      await advance(lookForHer ?? ladySkipPatch(state, gamePlayers), { expect });
    },
    [state, gamePlayers, players, advance]
  );
  const ladyForceSkip = useCallback(() => ladyForce('skip'), [ladyForce]);
  const ladyForceRandom = useCallback(() => ladyForce('random'), [ladyForce]);

  const setAssassinChoice = useCallback(
    async (targetId: string | null, callerId?: string) => {
      if (!state || state.phase !== 'assassinate') return;
      if (callerId) {
        const caller = players.find((p) => p.id === callerId);
        const callerRole = (caller?.gameData as Partial<AvalonGameData> | undefined)?.role;
        if (callerRole !== AvalonRole.Assassin) return;
      }
      if (targetId) {
        const target = players.find((p) => p.id === targetId);
        const targetData = target?.gameData as Partial<AvalonGameData> | undefined;
        if (!target || targetData?.team !== 'good') return;
      }
      await updateInPhase('assassinate', { assassinChoiceId: targetId });
    },
    [state, players, updateInPhase]
  );

  const assassinate = useCallback(
    async (targetId: string, callerId?: string) => {
      // Guard phase: chỉ resolve được khi đang ở phase 'assassinate' (sau khi
      // Phe Người đã đủ 3 Quest). Ngoài phase này, request bị bỏ qua.
      if (!state || state.phase !== 'assassinate') return;

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
      await advance({ phase: 'end', merlinTargetId: targetId, winner }, { status: 'end' });
    },
    [state, players, advance]
  );

  // Fallback: nếu Sát Thủ idle/disconnect, kết thúc với Phe Người thắng
  // (vì Phe Người đã đạt 3 Quest và không bị ám sát trúng).
  const assassinTimeoutAdvance = useCallback(async () => {
    if (!state || state.phase !== 'assassinate') return;
    await advance({ phase: 'end', winner: 'good', merlinTargetId: null }, { status: 'end' });
  }, [state, advance]);

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
    ladyForceSkip,
    ladyForceRandom,
    setAssassinChoice,
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
