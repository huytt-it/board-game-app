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
  applyLeave,
  startGame as startEngineGame,
  type Step,
} from '@/components/games/werewolf/engine/flow.ts';
import {
  isValidTarget,
  pickFor,
  seerLook,
  validateCupidPick,
  validateWitchPick,
  wolfBitesFor,
  type CupidPickError,
  type TargetKind,
  type WitchPickError,
} from '@/components/games/werewolf/engine/night.ts';
import { cupidPairsTonight, fullCounts, isWolfRole, nightActionOf, ROLE_TEAM } from '@/components/games/werewolf/engine/roles.ts';
import { aliveIds, isAlive } from '@/components/games/werewolf/engine/table.ts';
import { FULL_POTIONS, type NightPick } from '@/components/games/werewolf/engine/types.ts';
import {
  attacksOf,
  dataOf,
  elderLifeOf,
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
 * Lựa chọn Đêm ① đang hiện trên màn (kể cả khi lần ghi chưa về). `targetId`
 * là ô đang sáng (với mọi vai, như nhau khi không giữ). Thêm, chỉ thao tác
 * được khi đang giữ thẻ (rules §11.5, §11.7):
 *  - `biteIds`: Sói ở đêm cắn 2 — tập người cắn (≤ 2, người đầu = `targetId`);
 *  - `loverIds`: Cupid ở đêm 1 — hai người được ghép đôi (≤ 2).
 */
export interface NightDraft {
  targetId: string | null;
  biteIds?: string[] | null;
  loverIds?: string[] | null;
}

/**
 * Lựa chọn Đêm ② đang hiện trên màn (kể cả khi lần ghi chưa về). Người khác
 * chỉ có `guessId` (đoán Sói nhắm ai). Phù thủy có thêm `heal` / `poisonId`, và
 * `healId` ở đêm có 2 người bị nhắm (cứu ai, rules §11.7); `guessId` của Phù
 * thủy chỉ là ô đang sáng, engine bỏ qua.
 */
export type WitchDraft = Pick<WitchPick, 'heal' | 'poisonId' | 'guessId'> & { healId?: string | null };

export const EMPTY_WITCH_DRAFT: WitchDraft = { heal: false, poisonId: null, guessId: null, healId: null };

/** Kết quả Xác nhận Đêm ①: `error` là lý do Cupid chưa ghép đôi được (chỉ hiện trong thẻ giữ). */
export interface NightConfirmResult {
  outcome: PickOutcome;
  error: CupidPickError | null;
}

/** `error`: lý do Phù thủy không dùng được bình như vậy (validateWitchPick). */
export interface WitchResult extends PickResult {
  error: WitchPickError | null;
}

/** `nightPick` để ghi: chỉ có `biteIds` / `loverIds` khi màn có (đêm thường giữ đúng dạng v1). */
function nightPickOf(round: number, draft: NightDraft, confirmed: boolean): NightPick {
  return {
    round,
    targetId: draft.targetId,
    confirmed,
    ...(draft.biteIds != null ? { biteIds: [...draft.biteIds] } : {}),
    ...(draft.loverIds != null ? { loverIds: [...draft.loverIds] } : {}),
  };
}

const idsKey = (ids: readonly string[] | null | undefined) => (ids == null ? '-' : ids.join(','));

/** Cùng lựa chọn (không tính Xác nhận). */
function sameNightChoice(a: NightPick, b: NightPick): boolean {
  return a.targetId === b.targetId && idsKey(a.biteIds) === idsKey(b.biteIds) && idsKey(a.loverIds) === idsKey(b.loverIds);
}

function nightKey(p: NightPick): string {
  return `${p.targetId}|${idsKey(p.biteIds)}|${idsKey(p.loverIds)}`;
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
      if (step.phase === 'night') Object.assign(patch, { attack: null, attacks: [], dawnDeaths: [] });
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
      attacks: [],
      lovers: null,
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
        elderLife: null,
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

  /**
   * Người này để lựa chọn Đêm ① như `draft` được không (kiểm tra ngay, không
   * ghi). Ô đang sáng (`targetId`) theo việc của vai khi chạm lưới
   * (nightActionOf). `biteIds` chỉ cho Sói ở đêm cắn 2, `loverIds` chỉ cho
   * Cupid ở đêm 1. Tiên tri, Bảo vệ, Dân, Cupid, vai mở rộng: Xác nhận là chốt.
   * Sói (Ma Sói, Sói con — isWolfRole) đổi được, đổi thì mất Xác nhận.
   */
  const nightCheck = useCallback(
    (playerId: string, draft: NightDraft): PickOutcome => {
      if (!state || !table || !phaseOpen('night') || !isAlive(table, playerId)) return 'closed';
      const me = dataOf(byId.get(playerId));
      if (!me.role) return 'closed';
      const current = pickFor(me.nightPick, state.round);
      if (current?.confirmed && !isWolfRole(me.role)) return 'locked';
      const ok = (kind: TargetKind, id: string) => isValidTarget(table, playerId, kind, id, { guardLast: me.guardLast ?? null });
      if (draft.targetId !== null && !ok(nightActionOf(me.role), draft.targetId)) return 'invalid';
      const setOk = (ids: readonly string[], kind: TargetKind) => ids.length <= 2 && new Set(ids).size === ids.length && ids.every((id) => ok(kind, id));
      if (draft.biteIds != null && !(isWolfRole(me.role) && wolfBitesFor(table, state.round) === 2 && setOk(draft.biteIds, 'wolf'))) return 'invalid';
      if (draft.loverIds != null && !(cupidPairsTonight(me.role, state.round) && setOk(draft.loverIds, 'lover'))) return 'invalid';
      return 'ok';
    },
    [state, table, byId, phaseOpen]
  );

  /** Chọn (hoặc đổi) lựa chọn Đêm ①. Ghi vào gameData của chính mình (cả `biteIds` / `loverIds`). */
  const pickNight = useCallback(
    (playerId: string, draft: NightDraft): PickResult => {
      const outcome = nightCheck(playerId, draft);
      if (outcome !== 'ok' || !state) return { outcome, write: null };
      const round = state.round;
      const pick = nightPickOf(round, draft, false);
      const current = pickFor(dataOf(byId.get(playerId)).nightPick, round);
      // Cùng lựa chọn (kể cả khi đã Xác nhận): không ghi, không mất Xác nhận.
      if (current && sameNightChoice(current, pick) && !sent.current.has('night')) return { outcome, write: null };
      const write = enqueue('night', `${state.phaseStartedAt}:${nightKey(pick)}:pick`, () =>
        updateInPhase('night', round, {}, [{ playerId, data: { nightPick: pick } }])
      );
      return { outcome, write };
    },
    [state, byId, nightCheck, enqueue, updateInPhase]
  );

  /**
   * Xác nhận lựa chọn đang hiện trên màn ở Đêm ① (kể cả khi lần ghi chọn chưa
   * về). Ghi cả `biteIds` / `loverIds` trong cùng lần ghi. Tiên tri: kết quả soi
   * ghi vào seerLog cùng lần ghi này (E15). Cupid ở đêm 1 phải ghép đủ 2 người
   * (validateCupidPick): chưa đủ thì không xác nhận, lý do hiện trong thẻ giữ.
   * Ném lỗi khi gửi không được.
   */
  const confirmNight = useCallback(
    async (playerId: string, draft: NightDraft): Promise<NightConfirmResult> => {
      const outcome = nightCheck(playerId, draft);
      if (!state || !table || outcome !== 'ok') return { outcome, error: null };
      const me = dataOf(byId.get(playerId));
      if (!me.role || !draft.targetId) return { outcome: 'invalid', error: null };
      const round = state.round;
      if (cupidPairsTonight(me.role, round)) {
        const error = validateCupidPick(table, playerId, draft.loverIds ?? [], round);
        if (error) return { outcome: 'invalid', error };
      }
      const pick = nightPickOf(round, draft, true);
      const data: Partial<WerewolfGameData> = { nightPick: pick };
      const look = me.role === 'seer' ? seerLook(table, playerId, draft.targetId) : null;
      if (look) {
        const log = (me.seerLog ?? []).filter((l) => l.round !== round);
        data.seerLog = [...log, { round, targetId: look.targetId, isWolf: look.isWolf }];
      }
      await enqueue('night', `${state.phaseStartedAt}:${nightKey(pick)}:confirm`, () => updateInPhase('night', round, {}, [{ playerId, data }]));
      return { outcome: 'ok', error: null };
    },
    [state, table, byId, nightCheck, enqueue, updateInPhase]
  );

  /**
   * Hết Đêm ① (mọi người đã Xác nhận và bầy thống nhất, hoặc hết giờ): chốt
   * người bị nhắm (1–2 người) và, ở đêm 1, cặp đôi của Cupid. Ván có Phù thủy
   * thì sang Đêm ② (ghi `attack`, `attacks`, `lovers` + nhật ký); không thì tính
   * luôn kết quả đêm và sang Bình minh (ghi thêm người chết, `guardLast` của Bảo
   * vệ, `elderLife` của Già làng).
   */
  const resolveNightPhase = useCallback(async () => {
    if (!state || state.phase !== 'night' || !table || !ready) return;
    const nightPicks = nightPicksOf(state, players);
    const guardId = holderOf(table, 'guard');
    const guardLast = guardId ? (dataOf(byId.get(guardId)).guardLast ?? null) : null;
    const elderId = holderOf(table, 'elder');
    const elderData = elderId ? dataOf(byId.get(elderId)) : null;
    const step = afterNight(
      {
        table,
        round: state.round,
        nightPicks,
        witchPicks: {},
        potions: { heal: false, poison: false },
        guardLast,
        elderLife: elderData ? elderLifeOf(elderData) : true,
        rules: state.rules,
      },
      Math.random
    );
    // Quyết định dựa trên lựa chọn của mọi người còn sống (gồm `biteIds` /
    // `loverIds`), `guardLast` của Bảo vệ và mạng phụ của Già làng.
    const expected = new Map<string, Partial<BaseGameData>>();
    for (const id of aliveIds(table)) expected.set(id, { nightPick: nightPicks[id] ?? null });
    if (guardId) expected.set(guardId, { ...expected.get(guardId), guardLast });
    if (elderId) expected.set(elderId, { ...expected.get(elderId), elderLife: elderData?.elderLife ?? null });
    const expectPlayerData = [...expected].map(([playerId, data]) => ({ playerId, data }));
    const picked = { attack: step.attack, attacks: step.attacks, lovers: step.lovers };
    if (step.phase === 'night-witch') {
      await applyStep(step, { patch: picked, expectPlayerData });
      return;
    }
    if (!step.night) return;
    const playerData: PlayerWrites = [];
    if (guardId) playerData.push({ playerId: guardId, data: { guardLast: step.night.guardLast } });
    if (elderId) playerData.push({ playerId: elderId, data: { elderLife: step.night.elderLife } });
    await applyStep(step, {
      patch: { ...picked, dawnDeaths: step.night.dawnDeaths },
      expectPlayerData,
      playerData: playerData.length > 0 ? playerData : undefined,
    });
  }, [state, table, ready, players, byId, applyStep]);

  // ── Đêm ② (Phù thủy) ───────────────────────────────────────────────────

  /**
   * Người này để lựa chọn Đêm ② như `draft` được không (kiểm tra ngay, không
   * ghi). Ai cũng đoán được (người còn sống, kể cả mình). Chỉ Phù thủy còn sống
   * mới cứu / độc, kiểm bằng validateWitchPick (E5, E6; đêm có 2 người bị
   * nhắm thì phải chọn cứu ai — `healId`, rules §11.7). Xác nhận là chốt.
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
        const error = validateWitchPick(table, playerId, draft, attacksOf(state), potionsOf(me));
        if (error) return { outcome: 'invalid', error };
      } else if (draft.heal || draft.poisonId || draft.healId) {
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
      // `healId` chỉ có ở đêm có 2 người bị nhắm (đêm thường giữ đúng dạng v1).
      const pick: WitchPick = {
        round,
        heal: draft.heal,
        poisonId: draft.poisonId,
        guessId: draft.guessId,
        confirmed,
        ...(draft.healId ? { healId: draft.healId } : {}),
      };
      const current = pickFor(dataOf(byId.get(playerId)).witchPick, round);
      const same =
        !!current &&
        current.heal === pick.heal &&
        current.poisonId === pick.poisonId &&
        current.guessId === pick.guessId &&
        (current.healId ?? null) === (pick.healId ?? null) &&
        current.confirmed === pick.confirmed;
      if (same && !sent.current.has('witch')) return { outcome, error, write: null };
      const value = `${state.phaseStartedAt}:${pick.heal}:${pick.healId ?? null}:${pick.poisonId}:${pick.guessId}:${confirmed}`;
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

  /**
   * Hết Đêm ② (mọi người còn sống đã Xác nhận, hoặc hết giờ): tính kết quả đêm
   * (1–2 người bị nhắm, mạng phụ của Già làng, chết theo người yêu), sang Bình minh.
   */
  const resolveWitchPhase = useCallback(async () => {
    if (!state || state.phase !== 'night-witch' || !table || !ready) return;
    const nightPicks = nightPicksOf(state, players);
    const witchPicks = witchPicksOf(state, players);
    const guardId = holderOf(table, 'guard');
    const witchId = holderOf(table, 'witch');
    const guardData = guardId ? dataOf(byId.get(guardId)) : null;
    const witchData = witchId ? dataOf(byId.get(witchId)) : null;
    const guardLast = guardData?.guardLast ?? null;
    const elderId = holderOf(table, 'elder');
    const elderData = elderId ? dataOf(byId.get(elderId)) : null;
    const step = afterNightWitch({
      table,
      round: state.round,
      attack: state.attack,
      attacks: attacksOf(state),
      nightPicks,
      witchPicks,
      potions: witchData ? potionsOf(witchData) : { heal: false, poison: false },
      guardLast,
      elderLife: elderData ? elderLifeOf(elderData) : true,
    });
    // Quyết định dựa trên `witchPick` của mọi người còn sống, `nightPick` +
    // `guardLast` của Bảo vệ, bình của Phù thủy và mạng phụ của Già làng.
    const expected = new Map<string, Partial<BaseGameData>>();
    for (const id of aliveIds(table)) expected.set(id, { witchPick: witchPicks[id] ?? null });
    if (guardId) expected.set(guardId, { ...expected.get(guardId), nightPick: nightPicks[guardId] ?? null, guardLast });
    if (witchId) expected.set(witchId, { ...expected.get(witchId), potions: witchData?.potions ?? null });
    if (elderId) expected.set(elderId, { ...expected.get(elderId), elderLife: elderData?.elderLife ?? null });
    const playerData: PlayerWrites = [];
    if (witchId) playerData.push({ playerId: witchId, data: { potions: step.night.potions } });
    if (guardId) playerData.push({ playerId: guardId, data: { guardLast: step.night.guardLast } });
    if (elderId) playerData.push({ playerId: elderId, data: { elderLife: step.night.elderLife } });
    await applyStep(step, {
      patch: { dawnDeaths: step.night.dawnDeaths },
      expect: { attack: state.attack, attacks: state.attacks ?? null },
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

  // ── Cho rời làng (rules §7, E25) ───────────────────────────────────────

  /**
   * Chủ phòng cho một người còn sống rời làng, ở bất kỳ bước nào. KHÔNG đi qua
   * advance / applyStep: chúng đặt lại `phaseStartedAt`, đồng hồ của bước đang
   * chạy sẽ bị reset. Một CAS riêng (expect phase, phaseStartedAt, deaths) chỉ
   * thêm người chết và nhật ký; có phe thắng thì sang `end` luôn. Trả false
   * nếu không làm được (người đó đã chết, hoặc ván vừa đổi — thử lại).
   */
  const leaveVillage = useCallback(
    async (targetId: string) => {
      if (!roomId || !state || !table || !ready) return false;
      const res = applyLeave(table, state.round, state.phase, targetId);
      if (!res) return false;
      const patch: Partial<WerewolfGameState> = {
        deaths: [...state.deaths, ...res.newDeaths],
        log: [...state.log, ...res.log],
      };
      if (res.winner) {
        Object.assign(patch, {
          phase: 'end',
          phaseStartedAt: serverNow(),
          winner: res.winner.winner,
          endReason: res.winner.reason,
          hunter: null,
        });
      }
      return retryOnContention(() =>
        gameStorage.casGameState(
          roomId,
          { phase: state.phase, phaseStartedAt: state.phaseStartedAt, deaths: state.deaths },
          patch,
          { status: res.winner ? PHASE_STATUS.end : undefined }
        )
      );
    },
    [roomId, state, table, ready]
  );

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
    leaveVillage,
    readyToVote,
    proceedAfterTalk,
    castDayVote,
    resolveDayVote,
    proceedAfterVoteResult,
    restart,
  };
}
