'use client';

// Máy trạng thái của Ma Sói (plan §2.2, §4.2). Hook này chỉ làm ba việc: đọc
// dữ liệu phòng, gọi engine để quyết định, và ghi `Step` engine trả về trong
// MỘT compare-and-set. Luật nằm hết trong engine/.

import { useCallback, useMemo } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import { serverNow } from '@/lib/serverClock';
import type { BaseGameData, Player } from '@/types/player';
import type { Room, RoomStatus } from '@/types/room';
import {
  afterDawn,
  afterDeal,
  afterNight,
  afterTalk,
  afterVote,
  afterVoteResult,
  startGame as startEngineGame,
  type Step,
} from '@/components/games/werewolf/engine/flow.ts';
import { isValidTarget, pickFor, seerLook } from '@/components/games/werewolf/engine/night.ts';
import { fullCounts, nightActionOf, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { aliveIds, isAlive } from '@/components/games/werewolf/engine/table.ts';
import { FULL_POTIONS } from '@/components/games/werewolf/engine/types.ts';
import { dataOf, lobbyCounts, nightPicksOf, readConfig, readState, seated, tableOf, timeoutsFor } from './state';
import { PHASE_STATUS, phaseTimeoutMs, type DayBallot, type WerewolfGameData, type WerewolfGameState, type WwPhase } from './types';

type PlayerWrites = Array<{ playerId: string; data: Partial<BaseGameData> }>;

/** Kết quả một lần chạm chọn ở Đêm ①: màn chỉ báo lý do trong khung giữ-để-xem. */
export type PickOutcome = 'ok' | 'invalid' | 'locked' | 'closed';

export function useWerewolf(roomId: string | undefined, room: Room | null, players: Player[]) {
  const config = useMemo(() => (room ? readConfig(room) : null), [room]);
  const state = useMemo(() => (room ? readState(room) : null), [room]);
  const { table, ready } = useMemo(
    () => (state ? tableOf(state, players) : { table: null, ready: false }),
    [state, players]
  );
  const gamePlayers = useMemo(() => (state ? seated(state, players) : players), [state, players]);
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Mọi lần đổi phase đi qua đây: chỉ ghi nếu phòng vẫn ở đúng phase mà máy
  // này đang thấy (phase + phaseStartedAt) VÀ mọi dữ liệu quyết định dựa vào
  // (`expect` / `expectPlayerData`) vẫn như cũ. Trả false khi máy khác đã đi
  // trước; ném lỗi khi mất mạng.
  const advance = useCallback(
    async (
      patch: Partial<WerewolfGameState>,
      opts?: {
        status?: RoomStatus;
        playerData?: PlayerWrites;
        expect?: Record<string, unknown>;
        expectPlayerData?: PlayerWrites;
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

  // Thay đổi trong một phase (ack, phiếu, lựa chọn đêm) bị bỏ nếu phase đó (của
  // đúng vòng này) đã kết thúc, thay vì rơi vào phase sau.
  const updateInPhase = useCallback(
    async (phase: WwPhase, round: number, patch: Record<string, unknown>, playerData?: PlayerWrites) => {
      if (!roomId) return false;
      return gameStorage.casGameState(roomId, { phase, round }, patch, { playerData });
    },
    [roomId]
  );

  /** Ghi một `Step` của engine: phase, vòng, người chết, nhật ký, người thắng — một CAS. */
  const applyStep = useCallback(
    (
      step: Step,
      extra: {
        patch?: Partial<WerewolfGameState>;
        expect?: Record<string, unknown>;
        expectPlayerData?: PlayerWrites;
        playerData?: PlayerWrites;
      } = {}
    ) => {
      if (!state) return Promise.resolve(false);
      const patch: Partial<WerewolfGameState> = {
        phase: step.phase,
        round: step.round,
        deaths: [...state.deaths, ...step.newDeaths],
        log: [...state.log, ...step.log],
        acks: {},
        hunter: step.hunter,
        winner: step.winner?.winner ?? null,
        endReason: step.winner?.reason ?? null,
      };
      if (step.phase === 'night') Object.assign(patch, { attack: null, dawnDeaths: [] });
      if (step.phase === 'day-vote') patch.dayVotes = {};
      Object.assign(patch, extra.patch);
      return advance(patch, {
        status: PHASE_STATUS[step.phase],
        // Mọi quyết định dựa trên bàn chơi, tức là trên `deaths`.
        expect: { deaths: state.deaths, ...extra.expect },
        expectPlayerData: extra.expectPlayerData,
        playerData: extra.playerData,
      });
    },
    [state, advance]
  );

  /** Bước có giờ còn mở (UI khoá lựa chọn khi đồng hồ về 0). */
  const phaseOpen = useCallback(
    (phase: WwPhase) => !!state && state.phase === phase && serverNow() - state.phaseStartedAt < phaseTimeoutMs(state),
    [state]
  );

  // ── Sảnh → Xem vai ─────────────────────────────────────────────────────

  /** Chủ phòng bắt đầu ván: engine kiểm tra bộ vai (E28), xáo ghế, chia vai — một transaction. */
  const startGame = useCallback(async () => {
    if (!roomId || !config) return;
    const ids = players.map((p) => p.id);
    const counts = lobbyCounts(config.roleCounts, ids.length);
    const res = startEngineGame(ids, counts, Math.random);
    if (!res.ok) throw new Error(res.errors.map((e) => e.message).join(' '));
    const fresh: WerewolfGameState = {
      phase: res.step.phase,
      phaseStartedAt: serverNow(),
      round: res.step.round,
      seatOrder: res.seatOrder,
      roleCounts: fullCounts(counts),
      // Cài đặt của chủ phòng cố định cả ván từ đây.
      rules: config.rules,
      timeouts: timeoutsFor(config.phaseSeconds),
      deaths: [],
      acks: {},
      attack: null,
      dawnDeaths: [],
      dayVotes: {},
      lastVote: null,
      hunter: null,
      winner: null,
      endReason: null,
      log: [],
    };
    // Vai chỉ ghi vào gameData của từng người, không vào state theo ghế. Mọi
    // trường của ván trước cũng được ghi lại ở đây.
    const playerData: PlayerWrites = res.seatOrder.map((id) => {
      const role = res.roles[id];
      const data: WerewolfGameData = {
        role,
        team: ROLE_TEAM[role],
        nightPick: null,
        witchPick: null,
        potions: role === 'witch' ? FULL_POTIONS : null,
        guardLast: null,
        seerLog: [],
      };
      return { playerId: id, data };
    });
    // `phase: null`: phòng chưa có ván nào đang chạy.
    const ok = await gameStorage.casGameState(roomId, { phase: null }, fresh as unknown as Record<string, unknown>, {
      status: PHASE_STATUS[fresh.phase],
      playerData,
    });
    if (!ok) throw new Error('Ván đã được bắt đầu.');
  }, [roomId, config, players]);

  // ── Xem vai ────────────────────────────────────────────────────────────

  const ackDeal = useCallback(
    async (playerId: string) => {
      if (!state || state.phase !== 'deal') return;
      await updateInPhase('deal', state.round, { [`acks.${playerId}`]: true });
    },
    [state, updateInPhase]
  );

  /** Xem vai → Đêm 1 (mọi người đã xem, hoặc hết giờ). */
  const proceedAfterDeal = useCallback(async () => {
    if (!state || state.phase !== 'deal') return;
    await applyStep(afterDeal(state.round), { expect: { acks: state.acks } });
  }, [state, applyStep]);

  // ── Đêm ① ──────────────────────────────────────────────────────────────

  /** Chọn (hoặc đổi) người ở Đêm ①. Lựa chọn ghi vào gameData của chính mình. */
  const pickNight = useCallback(
    async (playerId: string, targetId: string): Promise<PickOutcome> => {
      if (!state || !table || !phaseOpen('night') || !isAlive(table, playerId)) return 'closed';
      const me = dataOf(byId.get(playerId));
      if (!me.role) return 'closed';
      const current = pickFor(me.nightPick, state.round);
      // Tiên tri, Bảo vệ, Dân: Xác nhận là chốt. Sói đổi được, đổi thì mất Xác nhận.
      if (current?.confirmed && me.role !== 'werewolf') return 'locked';
      if (!isValidTarget(table, playerId, nightActionOf(me.role), targetId, { guardLast: me.guardLast ?? null })) return 'invalid';
      if (current?.targetId === targetId) return 'ok';
      await updateInPhase('night', state.round, {}, [
        { playerId, data: { nightPick: { round: state.round, targetId, confirmed: false } } },
      ]);
      return 'ok';
    },
    [state, table, byId, phaseOpen, updateInPhase]
  );

  /** Xác nhận lựa chọn Đêm ①. Tiên tri: kết quả soi ghi vào seerLog cùng lần ghi này (E15). */
  const confirmNight = useCallback(
    async (playerId: string) => {
      if (!state || !table || !phaseOpen('night') || !isAlive(table, playerId)) return;
      const me = dataOf(byId.get(playerId));
      const current = pickFor(me.nightPick, state.round);
      if (!me.role || !current?.targetId || current.confirmed) return;
      if (!isValidTarget(table, playerId, nightActionOf(me.role), current.targetId, { guardLast: me.guardLast ?? null })) return;
      const data: Partial<WerewolfGameData> = { nightPick: { ...current, confirmed: true } };
      const look = me.role === 'seer' ? seerLook(table, playerId, current.targetId) : null;
      if (look) {
        const log = (me.seerLog ?? []).filter((l) => l.round !== state.round);
        data.seerLog = [...log, { round: state.round, targetId: look.targetId, isWolf: look.isWolf }];
      }
      await updateInPhase('night', state.round, {}, [{ playerId, data }]);
    },
    [state, table, byId, phaseOpen, updateInPhase]
  );

  /**
   * Hết Đêm ① (mọi người đã Xác nhận và bầy thống nhất, hoặc hết giờ): chốt
   * người bị nhắm, tính kết quả đêm, sang Bình minh. GĐ1 chưa có Phù thủy nên
   * luôn sang thẳng `dawn`.
   */
  const resolveNightPhase = useCallback(async () => {
    if (!state || state.phase !== 'night' || !table || !ready) return;
    const nightPicks = nightPicksOf(state, players);
    const guardId = state.seatOrder.find((id) => table.roles[id] === 'guard') ?? null;
    const guardLast = guardId ? (dataOf(byId.get(guardId)).guardLast ?? null) : null;
    const step = afterNight(
      {
        table,
        round: state.round,
        nightPicks,
        witchPicks: {},
        potions: { heal: false, poison: false },
        guardLast,
        rules: state.rules,
      },
      Math.random
    );
    if (step.phase !== 'dawn' || !step.night) return; // Đêm ② (Phù thủy) có ở GĐ2.
    // Quyết định dựa trên lựa chọn của mọi người còn sống và `guardLast` của Bảo vệ.
    const expected = new Map<string, Partial<BaseGameData>>();
    for (const id of aliveIds(table)) expected.set(id, { nightPick: nightPicks[id] ?? null });
    if (guardId) expected.set(guardId, { ...expected.get(guardId), guardLast });
    await applyStep(step, {
      patch: { attack: step.attack, dawnDeaths: step.night.dawnDeaths },
      expectPlayerData: [...expected].map(([playerId, data]) => ({ playerId, data })),
      playerData: guardId ? [{ playerId: guardId, data: { guardLast: step.night.guardLast } }] : undefined,
    });
  }, [state, table, ready, players, byId, applyStep]);

  // ── Bình minh ──────────────────────────────────────────────────────────

  /** Hết 8 giây Bình minh: hết Sói thì Dân thắng, không thì kiểm tra thắng rồi sang Thảo luận. */
  const proceedAfterDawn = useCallback(async () => {
    if (!state || state.phase !== 'dawn' || !table || !ready) return;
    await applyStep(afterDawn({ table, round: state.round, rules: state.rules }));
  }, [state, table, ready, applyStep]);

  // ── Thảo luận ──────────────────────────────────────────────────────────

  const readyToVote = useCallback(
    async (playerId: string) => {
      if (!state || state.phase !== 'day-talk' || !table || !isAlive(table, playerId)) return;
      await updateInPhase('day-talk', state.round, { [`acks.${playerId}`]: true });
    },
    [state, table, updateInPhase]
  );

  /** Thảo luận → Bỏ phiếu (mọi người còn sống sẵn sàng, hoặc hết giờ). */
  const proceedAfterTalk = useCallback(async () => {
    if (!state || state.phase !== 'day-talk') return;
    await applyStep(afterTalk(state.round), { expect: { acks: state.acks } });
  }, [state, applyStep]);

  // ── Bỏ phiếu ───────────────────────────────────────────────────────────

  /** Bầu (hoặc đổi phiếu): người còn sống khác mình, hoặc 'skip'. */
  const castDayVote = useCallback(
    async (playerId: string, ballot: DayBallot) => {
      if (!state || !table || !phaseOpen('day-vote') || !isAlive(table, playerId)) return;
      if (ballot !== 'skip' && !isValidTarget(table, playerId, 'vote', ballot)) return;
      await updateInPhase('day-vote', state.round, { [`dayVotes.${playerId}`]: ballot });
    },
    [state, table, phaseOpen, updateInPhase]
  );

  /** Hết Bỏ phiếu: kiểm phiếu (engine), người bị treo chết ngay, sang Kết quả. */
  const resolveDayVote = useCallback(async () => {
    if (!state || state.phase !== 'day-vote' || !table || !ready) return;
    const step = afterVote(table, state.round, state.dayVotes ?? {});
    await applyStep(step, {
      patch: { lastVote: { ballots: step.vote.ballots, executedId: step.vote.executedId, outcome: step.vote.outcome } },
      expect: { dayVotes: state.dayVotes ?? {} },
    });
  }, [state, table, ready, applyStep]);

  /** Hết 8 giây Kết quả: kiểm tra thắng rồi sang Đêm mới. */
  const proceedAfterVoteResult = useCallback(async () => {
    if (!state || state.phase !== 'vote-result' || !table || !ready) return;
    await applyStep(afterVoteResult(table, state.round, state.lastVote?.executedId ?? null));
  }, [state, table, ready, applyStep]);

  // ── Kết thúc ───────────────────────────────────────────────────────────

  /** Chủ phòng chơi lại: xoá vai của mọi người, phòng về sảnh. */
  const restart = useCallback(async () => {
    if (!roomId) return;
    await gameStorage.clearGameData(roomId);
    await gameStorage.resetRoom(roomId);
  }, [roomId]);

  return {
    config,
    state,
    table,
    ready,
    gamePlayers,
    startGame,
    ackDeal,
    proceedAfterDeal,
    pickNight,
    confirmNight,
    resolveNightPhase,
    proceedAfterDawn,
    readyToVote,
    proceedAfterTalk,
    castDayVote,
    resolveDayVote,
    proceedAfterVoteResult,
    restart,
  };
}
