'use client';

// Máy trạng thái của Ma Sói (plan §2.2, §4.2). Hook này chỉ làm ba việc: đọc
// dữ liệu phòng, gọi engine để quyết định, và ghi `Step` engine trả về trong
// MỘT compare-and-set. Luật nằm hết trong engine/.

import { useCallback, useMemo, useRef } from 'react';
import { gameStorage } from '@/services/database/firebaseAdapter';
import { serverNow } from '@/lib/serverClock';
import type { BaseGameData, Player } from '@/types/player';
import type { Room, RoomStatus } from '@/types/room';
import {
  afterDawn,
  afterDeal,
  afterHunter,
  afterNight,
  afterNightWitch,
  afterTalk,
  afterVote,
  afterVoteResult,
  startGame as startEngineGame,
  type Step,
} from '@/components/games/werewolf/engine/flow.ts';
import {
  isValidTarget,
  pickFor,
  seerLook,
  validateWitchPick,
  type WitchPickError,
} from '@/components/games/werewolf/engine/night.ts';
import { fullCounts, nightActionOf, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { aliveIds, isAlive } from '@/components/games/werewolf/engine/table.ts';
import { FULL_POTIONS } from '@/components/games/werewolf/engine/types.ts';
import {
  dataOf,
  holderOf,
  lobbyCounts,
  nightPicksOf,
  potionsOf,
  readConfig,
  readState,
  seated,
  tableOf,
  timeoutsFor,
  witchPicksOf,
} from './state';
import {
  PHASE_STATUS,
  phaseTimeoutMs,
  type DayBallot,
  type WerewolfGameData,
  type WerewolfGameState,
  type WitchPick,
  type WwPhase,
} from './types';

type PlayerWrites = Array<{ playerId: string; data: Partial<BaseGameData> }>;

/** Kết quả một lần chạm chọn ở Đêm ①: màn chỉ báo lý do trong khung giữ-để-xem. */
export type PickOutcome = 'ok' | 'invalid' | 'locked' | 'closed';

/** `write`: lần ghi đang gửi (null = không cần ghi gì). */
export interface PickResult {
  outcome: PickOutcome;
  write: Promise<unknown> | null;
}

/**
 * Lựa chọn Đêm ② đang hiện trên màn (kể cả khi lần ghi chưa về). Người khác
 * chỉ có `guessId` (đoán Sói nhắm ai). Phù thủy có thêm `heal` / `poisonId`;
 * `guessId` của Phù thủy chỉ là ô đang sáng, engine bỏ qua.
 */
export type WitchDraft = Pick<WitchPick, 'heal' | 'poisonId' | 'guessId'>;

export const EMPTY_WITCH_DRAFT: WitchDraft = { heal: false, poisonId: null, guessId: null };

/** `error`: lý do Phù thủy không dùng được bình như vậy (validateWitchPick). */
export interface WitchResult extends PickResult {
  error: WitchPickError | null;
}

// Nhiều người bấm cùng lúc thì các transaction trên doc phòng đụng nhau:
// Firestore huỷ, tự thử lại vài lần rồi bỏ cuộc — người chơi sẽ thấy báo lỗi
// "mất mạng" dù mạng vẫn tốt. Thử thêm vài lần với độ trễ ngẫu nhiên; mất
// mạng thật thì ném ngay.
const CONTENTION_TRIES = 4;

async function retryOnContention<T>(write: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await write();
    } catch (err) {
      const offline =
        (err as { code?: string } | null)?.code === 'unavailable' || (typeof navigator !== 'undefined' && navigator.onLine === false);
      if (offline || attempt >= CONTENTION_TRIES) throw err;
      await new Promise((r) => setTimeout(r, 150 + Math.random() * 300 * attempt));
    }
  }
}

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
      return retryOnContention(() => gameStorage.casGameState(roomId, { phase, round }, patch, { playerData }));
    },
    [roomId]
  );

  // Các lần ghi của chính người chơi này đi lần lượt, nên lần chạm sau luôn là
  // lần đến sau (chọn A rồi B thì kết quả là B). `sent` bỏ lần bấm trùng với
  // lần đang gửi.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const sent = useRef(new Map<string, string>());
  const enqueue = useCallback((key: string, value: string, write: () => Promise<unknown>): Promise<unknown> | null => {
    if (sent.current.get(key) === value) return null;
    sent.current.set(key, value);
    const run = queue.current.then(write, write);
    queue.current = run.catch(() => {});
    return run.then(
      (ok) => {
        if (sent.current.get(key) === value) sent.current.delete(key);
        return ok;
      },
      (err) => {
        // Gửi không được: lần bấm lại sau đó phải được gửi.
        if (sent.current.get(key) === value) sent.current.delete(key);
        throw err;
      }
    );
  }, []);

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
      await enqueue('ack', `deal@${state.phaseStartedAt}`, () => updateInPhase('deal', state.round, { [`acks.${playerId}`]: true }));
    },
    [state, enqueue, updateInPhase]
  );

  /** Xem vai → Đêm 1 (mọi người đã xem, hoặc hết giờ). */
  const proceedAfterDeal = useCallback(async () => {
    if (!state || state.phase !== 'deal') return;
    await applyStep(afterDeal(state.round), { expect: { acks: state.acks } });
  }, [state, applyStep]);

  // ── Đêm ① ──────────────────────────────────────────────────────────────

  /** Người này chọn được `targetId` lúc này không (kiểm tra ngay, không ghi). */
  const nightCheck = useCallback(
    (playerId: string, targetId: string): PickOutcome => {
      if (!state || !table || !phaseOpen('night') || !isAlive(table, playerId)) return 'closed';
      const me = dataOf(byId.get(playerId));
      if (!me.role) return 'closed';
      const current = pickFor(me.nightPick, state.round);
      // Tiên tri, Bảo vệ, Dân: Xác nhận là chốt. Sói đổi được, đổi thì mất Xác nhận.
      if (current?.confirmed && me.role !== 'werewolf') return 'locked';
      if (!isValidTarget(table, playerId, nightActionOf(me.role), targetId, { guardLast: me.guardLast ?? null })) return 'invalid';
      return 'ok';
    },
    [state, table, byId, phaseOpen]
  );

  /** Chọn (hoặc đổi) người ở Đêm ①. Lựa chọn ghi vào gameData của chính mình. */
  const pickNight = useCallback(
    (playerId: string, targetId: string): PickResult => {
      const outcome = nightCheck(playerId, targetId);
      if (outcome !== 'ok' || !state) return { outcome, write: null };
      const current = pickFor(dataOf(byId.get(playerId)).nightPick, state.round);
      if (current?.targetId === targetId && !sent.current.has('night')) return { outcome, write: null };
      const round = state.round;
      const write = enqueue('night', `${state.phaseStartedAt}:${targetId}:pick`, () =>
        updateInPhase('night', round, {}, [{ playerId, data: { nightPick: { round, targetId, confirmed: false } } }])
      );
      return { outcome, write };
    },
    [state, byId, nightCheck, enqueue, updateInPhase]
  );

  /**
   * Xác nhận người đang chọn ở Đêm ① (`targetId` là ô đang sáng trên màn, kể cả
   * khi lần ghi chọn chưa về). Tiên tri: kết quả soi ghi vào seerLog cùng lần
   * ghi này (E15).
   */
  const confirmNight = useCallback(
    async (playerId: string, targetId: string) => {
      if (!state || !table || nightCheck(playerId, targetId) !== 'ok') return;
      const me = dataOf(byId.get(playerId));
      if (!me.role) return;
      const round = state.round;
      const data: Partial<WerewolfGameData> = { nightPick: { round, targetId, confirmed: true } };
      const look = me.role === 'seer' ? seerLook(table, playerId, targetId) : null;
      if (look) {
        const log = (me.seerLog ?? []).filter((l) => l.round !== round);
        data.seerLog = [...log, { round, targetId: look.targetId, isWolf: look.isWolf }];
      }
      await enqueue('night', `${state.phaseStartedAt}:${targetId}:confirm`, () => updateInPhase('night', round, {}, [{ playerId, data }]));
    },
    [state, table, byId, nightCheck, enqueue, updateInPhase]
  );

  /**
   * Hết Đêm ① (mọi người đã Xác nhận và bầy thống nhất, hoặc hết giờ): chốt
   * người bị nhắm. Ván có Phù thủy thì sang Đêm ② (ghi `attack` + nhật ký);
   * không thì tính luôn kết quả đêm và sang Bình minh.
   */
  const resolveNightPhase = useCallback(async () => {
    if (!state || state.phase !== 'night' || !table || !ready) return;
    const nightPicks = nightPicksOf(state, players);
    const guardId = holderOf(table, 'guard');
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
    // Quyết định dựa trên lựa chọn của mọi người còn sống và `guardLast` của Bảo vệ.
    const expected = new Map<string, Partial<BaseGameData>>();
    for (const id of aliveIds(table)) expected.set(id, { nightPick: nightPicks[id] ?? null });
    if (guardId) expected.set(guardId, { ...expected.get(guardId), guardLast });
    const expectPlayerData = [...expected].map(([playerId, data]) => ({ playerId, data }));
    if (step.phase === 'night-witch') {
      await applyStep(step, { patch: { attack: step.attack }, expectPlayerData });
      return;
    }
    if (!step.night) return;
    await applyStep(step, {
      patch: { attack: step.attack, dawnDeaths: step.night.dawnDeaths },
      expectPlayerData,
      playerData: guardId ? [{ playerId: guardId, data: { guardLast: step.night.guardLast } }] : undefined,
    });
  }, [state, table, ready, players, byId, applyStep]);

  // ── Đêm ② (Phù thủy) ───────────────────────────────────────────────────

  /**
   * Người này để lựa chọn Đêm ② như `draft` được không (kiểm tra ngay, không
   * ghi). Ai cũng đoán được (người còn sống, kể cả mình). Chỉ Phù thủy còn sống
   * mới cứu / độc, kiểm bằng validateWitchPick (E5, E6). Xác nhận là chốt.
   */
  const witchCheck = useCallback(
    (playerId: string, draft: WitchDraft): { outcome: PickOutcome; error: WitchPickError | null } => {
      const closed = { outcome: 'closed' as const, error: null };
      if (!state || !table || !phaseOpen('night-witch') || !isAlive(table, playerId)) return closed;
      const me = dataOf(byId.get(playerId));
      if (!me.role) return closed;
      if (pickFor(me.witchPick, state.round)?.confirmed) return { outcome: 'locked', error: null };
      if (draft.guessId && !isValidTarget(table, playerId, 'guess', draft.guessId)) return { outcome: 'invalid', error: null };
      if (me.role === 'witch') {
        const error = validateWitchPick(table, playerId, draft, state.attack, potionsOf(me));
        if (error) return { outcome: 'invalid', error };
      } else if (draft.heal || draft.poisonId) {
        return { outcome: 'invalid', error: 'not-witch' };
      }
      return { outcome: 'ok', error: null };
    },
    [state, table, byId, phaseOpen]
  );

  const writeWitch = useCallback(
    (playerId: string, draft: WitchDraft, confirmed: boolean): WitchResult => {
      const { outcome, error } = witchCheck(playerId, draft);
      if (outcome !== 'ok' || !state) return { outcome, error, write: null };
      const round = state.round;
      const pick: WitchPick = { round, heal: draft.heal, poisonId: draft.poisonId, guessId: draft.guessId, confirmed };
      const current = pickFor(dataOf(byId.get(playerId)).witchPick, round);
      const same =
        !!current &&
        current.heal === pick.heal &&
        current.poisonId === pick.poisonId &&
        current.guessId === pick.guessId &&
        current.confirmed === pick.confirmed;
      if (same && !sent.current.has('witch')) return { outcome, error, write: null };
      const value = `${state.phaseStartedAt}:${pick.heal}:${pick.poisonId}:${pick.guessId}:${confirmed}`;
      const write = enqueue('witch', value, () => updateInPhase('night-witch', round, {}, [{ playerId, data: { witchPick: pick } }]));
      return { outcome, error, write };
    },
    [state, byId, witchCheck, enqueue, updateInPhase]
  );

  /** Chọn / đổi lựa chọn Đêm ② (đoán, cứu, độc). Ghi vào gameData của chính mình. */
  const pickWitch = useCallback((playerId: string, draft: WitchDraft) => writeWitch(playerId, draft, false), [writeWitch]);

  /**
   * Xác nhận Đêm ②, kể cả khi chưa chọn gì ("không làm gì" trông như "không
   * đoán"). Trả kết quả kiểm tra để màn báo lý do trong thẻ giữ; ném lỗi khi
   * gửi không được.
   */
  const confirmWitch = useCallback(
    async (playerId: string, draft: WitchDraft): Promise<Pick<WitchResult, 'outcome' | 'error'>> => {
      const { outcome, error, write } = writeWitch(playerId, draft, true);
      await write;
      return { outcome, error };
    },
    [writeWitch]
  );

  /** Hết Đêm ② (mọi người còn sống đã Xác nhận, hoặc hết giờ): tính kết quả đêm, sang Bình minh. */
  const resolveWitchPhase = useCallback(async () => {
    if (!state || state.phase !== 'night-witch' || !table || !ready) return;
    const nightPicks = nightPicksOf(state, players);
    const witchPicks = witchPicksOf(state, players);
    const guardId = holderOf(table, 'guard');
    const witchId = holderOf(table, 'witch');
    const guardData = guardId ? dataOf(byId.get(guardId)) : null;
    const witchData = witchId ? dataOf(byId.get(witchId)) : null;
    const guardLast = guardData?.guardLast ?? null;
    const step = afterNightWitch({
      table,
      round: state.round,
      attack: state.attack,
      nightPicks,
      witchPicks,
      potions: witchData ? potionsOf(witchData) : { heal: false, poison: false },
      guardLast,
    });
    // Quyết định dựa trên `witchPick` của mọi người còn sống, `nightPick` +
    // `guardLast` của Bảo vệ và bình của Phù thủy.
    const expected = new Map<string, Partial<BaseGameData>>();
    for (const id of aliveIds(table)) expected.set(id, { witchPick: witchPicks[id] ?? null });
    if (guardId) expected.set(guardId, { ...expected.get(guardId), nightPick: nightPicks[guardId] ?? null, guardLast });
    if (witchId) expected.set(witchId, { ...expected.get(witchId), potions: witchData?.potions ?? null });
    const playerData: PlayerWrites = [];
    if (witchId) playerData.push({ playerId: witchId, data: { potions: step.night.potions } });
    if (guardId) playerData.push({ playerId: guardId, data: { guardLast: step.night.guardLast } });
    await applyStep(step, {
      patch: { dawnDeaths: step.night.dawnDeaths },
      expect: { attack: state.attack },
      expectPlayerData: [...expected].map(([playerId, data]) => ({ playerId, data })),
      playerData,
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
      await enqueue('ack', `talk@${state.phaseStartedAt}`, () => updateInPhase('day-talk', state.round, { [`acks.${playerId}`]: true }));
    },
    [state, table, enqueue, updateInPhase]
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
      if ((state.dayVotes ?? {})[playerId] === ballot && !sent.current.has('vote')) return;
      await enqueue('vote', `${state.phaseStartedAt}:${ballot}`, () =>
        updateInPhase('day-vote', state.round, { [`dayVotes.${playerId}`]: ballot })
      );
    },
    [state, table, phaseOpen, enqueue, updateInPhase]
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

  // ── Thợ săn ────────────────────────────────────────────────────────────

  /**
   * Thợ săn bắn (`shotId`) hoặc không bắn (null): chuyển phase ngay bằng một
   * CAS với expect { hunter, deaths }, không cần lưu lựa chọn riêng. Engine
   * kiểm tra thắng sau phát bắn. Trả false nếu bước đã kết thúc (hết giờ, máy
   * khác đã chuyển).
   */
  const shootHunter = useCallback(
    async (playerId: string, shotId: string | null) => {
      if (!state || state.phase !== 'hunter' || !state.hunter || !table || !ready) return false;
      if (state.hunter.hunterId !== playerId || !phaseOpen('hunter')) return false;
      if (shotId && !isValidTarget(table, playerId, 'shoot', shotId)) return false;
      return applyStep(afterHunter(table, state.round, state.hunter, shotId), { expect: { hunter: state.hunter } });
    },
    [state, table, ready, phaseOpen, applyStep]
  );

  /** Hết giờ Thợ săn: coi như không bắn. */
  const hunterTimeout = useCallback(async () => {
    if (!state || state.phase !== 'hunter' || !state.hunter || !table || !ready) return;
    await applyStep(afterHunter(table, state.round, state.hunter, null), { expect: { hunter: state.hunter } });
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
    nightCheck,
    pickNight,
    confirmNight,
    resolveNightPhase,
    pickWitch,
    confirmWitch,
    resolveWitchPhase,
    proceedAfterDawn,
    shootHunter,
    hunterTimeout,
    readyToVote,
    proceedAfterTalk,
    castDayVote,
    resolveDayVote,
    proceedAfterVoteResult,
    restart,
  };
}
