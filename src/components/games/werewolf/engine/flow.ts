// Luồng ván: điều kiện kết thúc sớm của từng phase và phase kế (plan §4.2,
// rules §5, §11). Mỗi hàm `after*` nhận dữ liệu lúc phase kết thúc và trả về
// một `Step`; UI ghi Step đó trong cùng một CAS với lần đổi phase.

import { tallyDayVote, type DayVoteResult } from './day.ts';
import { hunterLog, leftLog, loveLog, nightOneLog, nightTwoLog, phasePart, voteLog } from './log.ts';
import {
  cupidPairOf,
  guardChoiceOf,
  guessPicksOf,
  isValidTarget,
  pickFor,
  resolveNight,
  seerLookOf,
  suspectPicksOf,
  tallyBites,
  wolfStatus,
  type BiteTally,
  type NightInput,
  type NightResult,
} from './night.ts';
import { shuffle } from './random.ts';
import { dealRoles, validateSetup, type SetupError } from './roles.ts';
import { aliveIds, countsAsLeft, hasRole, isAlive, loveDeaths, loverOf, loversOf, withDeaths } from './table.ts';
import { checkWinner, isLoversTeam } from './win.ts';
import type {
  DayBallot,
  HunterTurn,
  NightPick,
  PickMap,
  RoleCounts,
  Rng,
  WinResult,
  WitchPick,
  WwDeath,
  WwLogEntry,
  WwPhase,
  WwRole,
  WwRules,
  WwTable,
} from './types.ts';

/** Quyết định khi một phase kết thúc. */
export interface Step {
  phase: WwPhase;
  /** Vòng sau bước này: tăng 1 mỗi lần vào `night` (đêm 1 / ngày 1 = 1). */
  round: number;
  /** Người chết ở bước này (kể cả người chết theo người yêu): nối vào `state.deaths` trong cùng transaction. */
  newDeaths: WwDeath[];
  /** Mục nối vào "Diễn biến ván". */
  log: WwLogEntry[];
  /** Có khi `phase === 'end'`. */
  winner: WinResult | null;
  /** Có khi `phase === 'hunter'`. */
  hunter: HunterTurn | null;
}

function step(phase: WwPhase, round: number, extra: Partial<Step> = {}): Step {
  return { phase, round, newDeaths: [], log: [], winner: null, hunter: null, ...extra };
}

// ── Bắt đầu ván ──────────────────────────────────────────────────────────

export type StartResult =
  | { ok: true; seatOrder: string[]; roles: Record<string, WwRole>; step: Step }
  | { ok: false; errors: SetupError[] };

/**
 * Kiểm tra bộ vai (E28, E55), xáo ghế và chia vai bằng `rng`. Client thực
 * hiện CAS gọi hàm này và ghi kết quả; client khác không tính lại (plan §2.2).
 * `roles` chỉ ghi vào `players/<id>.gameData`, không vào state.
 */
export function startGame(playerIds: readonly string[], counts: RoleCounts, rng: Rng): StartResult {
  const errors = validateSetup(playerIds.length, counts);
  if (errors.length > 0) return { ok: false, errors };
  const seatOrder = shuffle(playerIds, rng);
  const roles = dealRoles(seatOrder, counts, rng);
  return { ok: true, seatOrder, roles, step: step('deal', 0) };
}

// ── Kết thúc sớm (cột "Kết thúc khi" của plan §4.2) ──────────────────────

/** Xem vai: mọi người còn sống đã bấm "Đã xem". */
export function dealDone(table: WwTable, acks: Record<string, boolean>): boolean {
  return aliveIds(table).every((id) => acks[id] === true);
}

/**
 * Đêm ①: mọi người còn sống đã Xác nhận **và** bầy Sói đã thống nhất (rules
 * §5.2; đêm cắn 2 thì thống nhất cả cặp — rules §11.7).
 */
export function nightDone(table: WwTable, nightPicks: PickMap<NightPick>, round: number): boolean {
  const allConfirmed = aliveIds(table).every((id) => pickFor(nightPicks[id], round)?.confirmed === true);
  return allConfirmed && wolfStatus(table, nightPicks, round).agreed;
}

/** Đêm ②: mọi người còn sống đã Xác nhận (rules §5.4). */
export function witchDone(table: WwTable, witchPicks: PickMap<WitchPick>, round: number): boolean {
  return aliveIds(table).every((id) => pickFor(witchPicks[id], round)?.confirmed === true);
}

/** Thảo luận: mọi người còn sống đã bấm "Sẵn sàng bỏ phiếu". */
export function talkDone(table: WwTable, acks: Record<string, boolean>): boolean {
  return dealDone(table, acks);
}

/** Bỏ phiếu: mọi người còn sống đã bầu (kể cả "Bỏ qua"). */
export function voteDone(table: WwTable, votes: Record<string, DayBallot | null | undefined>): boolean {
  return aliveIds(table).every((id) => typeof votes[id] === 'string');
}

// ── Phase kế ─────────────────────────────────────────────────────────────

/** Xem vai → Đêm 1. */
export function afterDeal(round: number): Step {
  return step('night', round + 1);
}

export interface NightOneInput extends Omit<NightInput, 'attack' | 'attacks'> {
  rules: WwRules;
}

export interface NightStep extends Step {
  /** Người bị nhắm đầu tiên (theo ghế), hoặc null; đêm thường là người bị nhắm. Ghi vào `state.attack`. */
  attack: string | null;
  /** Mọi người bị nhắm đêm nay, theo ghế (đêm cắn 2: tối đa 2). Phù thủy thấy ở Đêm ②. */
  attacks: string[];
  wolves: BiteTally;
  /** Có khi sang thẳng `dawn` (ván không có Phù thủy). */
  night: NightResult | null;
  /**
   * Cặp đôi của ván sau Đêm ① này (cặp Cupid vừa ghép ở đêm 1, hoặc cặp đã có
   * trong `table.lovers`), hoặc null. Ghi vào `state.lovers`.
   */
  lovers: [string, string] | null;
}

/**
 * Đêm ① kết thúc: chốt người bị nhắm (1 hoặc 2 người — tallyBites); đêm 1 thì
 * chốt luôn cặp đôi của Cupid (E40, E41), có hiệu lực ngay từ đêm này. Ván có
 * Phù thủy (kể cả khi Phù thủy đã chết hay hết bình — E26) thì sang Đêm ②;
 * không thì tính luôn kết quả đêm và sang Bình minh.
 */
export function afterNight(input: NightOneInput, rng: Rng): NightStep {
  const { round, nightPicks, rules, guardLast } = input;
  const pair = !input.table.lovers && round === 1 ? cupidPairOf(input.table, nightPicks, round) : null;
  const table: WwTable = pair ? { ...input.table, lovers: pair.loverIds } : input.table;
  const wolves = tallyBites(table, nightPicks, round, rules.wolfTie, rng);
  const log = nightOneLog(
    round,
    wolves,
    guardChoiceOf(table, nightPicks, round, guardLast),
    seerLookOf(table, nightPicks, round),
    suspectPicksOf(table, nightPicks, round),
    pair ? { ...pair, mixed: isLoversTeam(table) } : null,
  );
  const attacks = wolves.targetIds;
  const picked = { attack: attacks[0] ?? null, attacks, wolves, lovers: loversOf(table) };
  if (hasRole(table, 'witch')) {
    return { ...step('night-witch', round, { log }), ...picked, night: null };
  }
  const night = resolveNight({ ...input, table, attack: picked.attack, attacks });
  return {
    ...step('dawn', round, {
      newDeaths: night.newDeaths,
      log: [...log, ...nightTwoLog(table, round, null, {}, night.newDeaths, night.elderHitId)],
    }),
    ...picked,
    night,
  };
}

export interface WitchStep extends Step {
  night: NightResult;
}

/** Đêm ② kết thúc: tính kết quả đêm (rules §5.5) và sang Bình minh. `input.table` có `lovers` của ván. */
export function afterNightWitch(input: NightInput): WitchStep {
  const night = resolveNight(input);
  const guesses = guessPicksOf(input.table, input.witchPicks, input.round);
  return {
    ...step('dawn', input.round, {
      newDeaths: night.newDeaths,
      log: nightTwoLog(input.table, input.round, night.witch, guesses, night.newDeaths, night.elderHitId),
    }),
    night,
  };
}

/**
 * Thợ săn chết vì nguyên nhân này thì có được bắn không (rules §3, §5.7, §7,
 * §11.5). Chết theo người yêu thì được bắn (E44), trừ khi người yêu bị cho rời
 * làng (`countsAsLeft`, kiểm ở dawnHunter / afterVoteResult).
 */
export function hunterCanShoot(cause: WwDeath['cause'], rules: WwRules): boolean {
  if (cause === 'wolf' || cause === 'vote' || cause === 'love') return true;
  if (cause === 'poison') return rules.hunterShootsWhenPoisoned;
  return false; // 'hunter' không xảy ra (chỉ có 1 Thợ săn); 'left' thì không bắn (E25)
}

/** Thợ săn vừa chết trong đêm `round` (bị cắn, bị độc, chết theo người yêu) và được bắn, hoặc null. */
export function dawnHunter(table: WwTable, round: number, rules: WwRules): HunterTurn | null {
  const death = table.deaths.find(
    (d) =>
      d.round === round &&
      table.roles[d.id] === 'hunter' &&
      (d.cause === 'wolf' || d.cause === 'poison' || d.cause === 'love'),
  );
  return death && hunterCanShoot(death.cause, rules) && !countsAsLeft(table, death.id)
    ? { hunterId: death.id, after: 'dawn' }
    : null;
}

export interface DawnInput {
  /** Bàn đã có người chết đêm nay. */
  table: WwTable;
  round: number;
  rules: WwRules;
}

/**
 * Bình minh kết thúc (rules §5.6, §11.8): hết Sói thì Dân thắng, bỏ qua Thợ
 * săn (E20); Thợ săn vừa chết và được bắn thì sang Thợ săn, kiểm tra thắng sau
 * phát bắn (E16, E19, E44); không thì kiểm tra thắng rồi sang Thảo luận.
 */
export function afterDawn({ table, round, rules }: DawnInput): Step {
  const winner = checkWinner(table);
  if (winner?.winner === 'village') return step('end', round, { winner });
  const hunter = dawnHunter(table, round, rules);
  if (hunter) return step('hunter', round, { hunter });
  if (winner) return step('end', round, { winner });
  return step('day-talk', round);
}

/** Thảo luận → Bỏ phiếu. */
export function afterTalk(round: number): Step {
  return step('day-vote', round);
}

export interface VoteStep extends Step {
  /** Ghi `lastVote` / phiếu công khai cho bước Kết quả. */
  vote: DayVoteResult;
}

/**
 * Bỏ phiếu kết thúc: kiểm phiếu, người bị treo chết ngay ("treo") và người yêu
 * của họ chết theo ngay (E43), sang Kết quả.
 */
export function afterVote(table: WwTable, round: number, votes: Record<string, DayBallot | null | undefined>): VoteStep {
  const vote = tallyDayVote(table, votes);
  const hanged: WwDeath[] = vote.executedId ? [{ id: vote.executedId, round, cause: 'vote' }] : [];
  const love = loveDeaths(table, hanged, round);
  return {
    ...step('vote-result', round, { newDeaths: [...hanged, ...love], log: [...voteLog(round, vote), ...loveLog(table, love, 'day')] }),
    vote,
  };
}

/** Thợ săn chết vì lần treo vòng `round`: bị treo (E18), hoặc chết theo người bị treo (E44). */
function hunterOfVote(table: WwTable, round: number, executedId: string): string | null {
  if (table.roles[executedId] === 'hunter') return executedId;
  const lover = loverOf(table, executedId);
  if (!lover || table.roles[lover] !== 'hunter') return null;
  const death = table.deaths.find((d) => d.id === lover);
  return death?.cause === 'love' && death.round === round ? lover : null;
}

/**
 * Kết quả phiếu kết thúc (rules §5.9, §11.8): Kẻ chán đời bị treo thì thắng
 * ngay (E37, E38), trước cả Thợ săn; Thợ săn chết vì lần treo này thì sang Thợ
 * săn (E18, E44); không thì kiểm tra thắng rồi sang Đêm mới.
 */
export function afterVoteResult(table: WwTable, round: number, executedId: string | null): Step {
  const winner = checkWinner(table, executedId);
  if (winner?.reason === 'tanner-hanged') return step('end', round, { winner });
  const hunterId = executedId ? hunterOfVote(table, round, executedId) : null;
  if (hunterId) return step('hunter', round, { hunter: { hunterId, after: 'vote' } });
  if (winner) return step('end', round, { winner });
  return step('night', round + 1);
}

/**
 * Thợ săn bắn xong / bỏ / hết giờ (`shotId` null = không bắn). Người bị bắn
 * chết ngay ("Thợ săn"), Bảo vệ không chặn được; người yêu của họ chết theo
 * (E45). Kiểm tra thắng **sau** phát bắn (E19), rồi về luồng thường: sau bình
 * minh → Thảo luận, sau khi treo → Đêm.
 */
export function afterHunter(table: WwTable, round: number, hunter: HunterTurn, shotId: string | null): Step {
  const target = isValidTarget(table, hunter.hunterId, 'shoot', shotId) ? (shotId as string) : null;
  const shot: WwDeath[] = target ? [{ id: target, round, cause: 'hunter' }] : [];
  const love = loveDeaths(table, shot, round);
  const newDeaths = [...shot, ...love];
  const log = [...hunterLog(round, hunter.hunterId, target), ...loveLog(table, love, 'day')];
  const winner = checkWinner(withDeaths(table, newDeaths));
  if (winner) return step('end', round, { newDeaths, log, winner });
  return hunter.after === 'dawn'
    ? step('day-talk', round, { newDeaths, log })
    : step('night', round + 1, { newDeaths, log });
}

// ── Cho rời làng (rules §7, E25, E46) ────────────────────────────────────

export interface LeaveResult {
  /** Người rời làng, rồi người yêu của họ (chết theo — E46). */
  newDeaths: WwDeath[];
  log: WwLogEntry[];
  /** Có kết quả thì chuyển sang `end`; null thì giữ nguyên phase. */
  winner: WinResult | null;
}

/**
 * Chủ phòng cho `id` rời làng ở bất kỳ phase nào: tính là chết ("rời làng"),
 * người yêu chết theo, kiểm tra thắng ngay. Thợ săn rời làng — hoặc chết theo
 * người yêu rời làng — thì không được bắn. Sói rời làng thì lựa chọn đêm nay
 * của nó không còn được tính (wolfStatus chỉ đếm Sói còn sống). Null nếu
 * người đó đã chết hoặc ván đã kết thúc.
 */
export function applyLeave(table: WwTable, round: number, phase: WwPhase, id: string): LeaveResult | null {
  if (phase === 'end' || !isAlive(table, id)) return null;
  const left: WwDeath[] = [{ id, round, cause: 'left' }];
  const love = loveDeaths(table, left, round);
  const newDeaths = [...left, ...love];
  return {
    newDeaths,
    log: [...leftLog(round, id, phase), ...loveLog(table, love, phasePart(phase))],
    winner: checkWinner(withDeaths(table, newDeaths)),
  };
}
