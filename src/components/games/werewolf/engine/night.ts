// Ban đêm: ai được chọn ai, bầy Sói thống nhất, tính kết quả đêm
// (rules §5.2–§5.5, §7, §11).
//
// Lựa chọn mang `round`: lựa chọn của đêm trước không bao giờ bị tính sang đêm
// sau, nên không phải xoá chúng khi đổi phase (plan §4.3).

import { pickOne } from './random.ts';
import { nightActionOf, seenAsWolf } from './roles.ts';
import { aliveIds, aliveWithRole, countsAsLeft, inSeatOrder, isAlive, isWolf, loveDeaths } from './table.ts';
import type {
  DeathCause,
  NightPick,
  PickMap,
  Potions,
  Rng,
  WitchPick,
  WolfBites,
  WolfTallyHow,
  WwDeath,
  WwRules,
  WwTable,
} from './types.ts';

/** Lựa chọn của đúng đêm `round`, hoặc null. */
export function pickFor<T extends { round: number }>(pick: T | null | undefined, round: number): T | null {
  return pick && pick.round === round ? pick : null;
}

/** Người bị nhắm dạng danh sách (bỏ trùng): nhận một id, null, hoặc danh sách (đêm cắn 2). */
function attackList(attack: string | null | undefined | readonly string[]): string[] {
  if (typeof attack === 'string') return [attack];
  if (!attack) return [];
  return [...new Set(attack.filter((id) => typeof id === 'string' && id !== ''))];
}

// ── Ai được chọn ai ──────────────────────────────────────────────────────

/**
 * Loại lựa chọn:
 * - `wolf`: Sói cắn (người sống, không phải Sói — E14);
 * - `seer`: Tiên tri soi (người sống khác mình);
 * - `guard`: Bảo vệ che (người sống, được tự che, khác người đã che đêm trước — E8);
 * - `suspect`: "người mình nghi" ở Đêm ① (người sống khác mình);
 * - `lover`: Cupid ghép đôi ở đêm 1 (người sống, kể cả mình — rules §11.5);
 * - `guess`: đoán Sói nhắm ai ở Đêm ② (người sống, kể cả mình);
 * - `poison`: Phù thủy độc (người sống khác mình, khác người vừa chọn cứu — E5, E6);
 * - `vote`: phiếu ban ngày (người sống khác mình — E23);
 * - `shoot`: Thợ săn bắn (người sống; Thợ săn đã chết nên không tự bắn được).
 */
export type TargetKind = 'wolf' | 'seer' | 'guard' | 'suspect' | 'lover' | 'guess' | 'poison' | 'vote' | 'shoot';

export interface TargetContext {
  /** `guard`: người Bảo vệ đã che đêm trước. */
  guardLast?: string | null;
  /** `poison`: người bị Sói nhắm đêm nay (đêm thường). */
  attack?: string | null;
  /** `poison`: Phù thủy đang chọn cứu người bị nhắm (`attack`). */
  healing?: boolean;
  /** `poison`: người Phù thủy đang chọn cứu (dùng được cả ở đêm cắn 2). */
  healId?: string | null;
}

/** Mục tiêu hợp lệ của `actorId`, theo thứ tự ghế. Người chết không chọn gì (trừ Thợ săn bắn). */
export function validTargets(table: WwTable, actorId: string, kind: TargetKind, ctx: TargetContext = {}): string[] {
  if (kind !== 'shoot' && !isAlive(table, actorId)) return [];
  const alive = aliveIds(table);
  switch (kind) {
    case 'wolf':
      return alive.filter((id) => !isWolf(table, id));
    case 'guard':
      return alive.filter((id) => id !== (ctx.guardLast ?? null));
    case 'guess':
    case 'lover':
      return alive;
    case 'poison':
      return alive.filter(
        (id) => id !== actorId && !(ctx.healing && id === (ctx.attack ?? null)) && !(ctx.healId && id === ctx.healId),
      );
    case 'seer':
    case 'suspect':
    case 'vote':
    case 'shoot':
      return alive.filter((id) => id !== actorId);
  }
}

export function isValidTarget(
  table: WwTable,
  actorId: string,
  kind: TargetKind,
  targetId: string | null | undefined,
  ctx: TargetContext = {},
): boolean {
  return !!targetId && validTargets(table, actorId, kind, ctx).includes(targetId);
}

// ── Bầy Sói (rules §5.3, §11.7) ──────────────────────────────────────────

/**
 * Số người bầy được cắn đêm `round` (rules §11.7): 2 nếu Sói con chết ở vòng
 * `round − 1` (ban ngày, hoặc ban đêm vòng đó) vì lý do khác rời làng
 * (E49–E51), không thì 1. Suy ra từ `deaths`, không cần lưu thêm gì.
 */
export function wolfBitesFor(table: WwTable, round: number): WolfBites {
  const cubDied = table.deaths.some(
    (d) => d.round === round - 1 && table.roles[d.id] === 'wolfcub' && !countsAsLeft(table, d.id),
  );
  return cubDied ? 2 : 1;
}

export interface WolfVoteCount {
  targetId: string;
  votes: number;
}

export interface WolfStatus {
  /** Sói còn sống, theo thứ tự ghế. */
  wolves: string[];
  /**
   * Lựa chọn hợp lệ của từng Sói còn sống (null = chưa chọn / chọn sai). Đêm
   * cắn 2: người đầu (theo ghế) trong tập của Sói đó; đủ tập ở `sets`.
   */
  picks: Record<string, string | null>;
  /** Tập người từng Sói còn sống chọn cắn, theo ghế (đêm thường 0–1 người, đêm cắn 2 0–2 người). */
  sets: Record<string, string[]>;
  /** Phiếu theo mục tiêu, theo thứ tự ghế của mục tiêu. Đêm cắn 2 mỗi Sói có tới 2 phiếu. */
  counts: WolfVoteCount[];
  /** Số người bầy được cắn đêm nay. */
  bites: WolfBites;
  /**
   * Mọi Sói còn sống đang chọn cùng một người (đêm cắn 2: cùng một cặp — E13:
   * còn một Sói thì lựa chọn của nó là thống nhất). Không còn Sói thì coi như
   * thống nhất, để đêm không bị chặn.
   */
  agreed: boolean;
  /** Người cả bầy đã thống nhất (đêm thường), hoặc null. Đêm cắn 2 xem `agreedIds`. */
  agreedId: string | null;
  /** Những người cả bầy đã thống nhất, theo ghế, hoặc null. */
  agreedIds: string[] | null;
}

/**
 * Tập người một Sói chọn cắn: đêm thường là `targetId`; đêm cắn 2 là
 * `biteIds` (thiếu thì `targetId`). Chỉ giữ người hợp lệ, khác nhau, tối đa `bites` người.
 */
function biteSetOf(table: WwTable, wolfId: string, pick: NightPick | null, bites: WolfBites): string[] {
  if (!pick) return [];
  const raw = bites === 2 && Array.isArray(pick.biteIds) ? pick.biteIds : [pick.targetId];
  const out: string[] = [];
  for (const id of raw) {
    if (out.length < bites && id && !out.includes(id) && isValidTarget(table, wolfId, 'wolf', id)) out.push(id);
  }
  return inSeatOrder(table, out);
}

/**
 * Trạng thái bầy Sói lúc này: dùng cho màn của Sói ("Bầy chưa thống nhất:
 * Lan (1) · Minh (1)") và cho điều kiện kết thúc sớm. Mọi lựa chọn đang có
 * đều được tính, đã Xác nhận hay chưa. Sói đã chết / rời làng không còn được
 * tính (E25). `bites` mặc định theo `wolfBitesFor`.
 */
export function wolfStatus(
  table: WwTable,
  nightPicks: PickMap<NightPick>,
  round: number,
  bites: WolfBites = wolfBitesFor(table, round),
): WolfStatus {
  const wolves = aliveIds(table).filter((id) => isWolf(table, id));
  const picks: Record<string, string | null> = {};
  const sets: Record<string, string[]> = {};
  const votes = new Map<string, number>();
  for (const wolfId of wolves) {
    const set = biteSetOf(table, wolfId, pickFor(nightPicks[wolfId], round), bites);
    sets[wolfId] = set;
    picks[wolfId] = set[0] ?? null;
    for (const target of set) votes.set(target, (votes.get(target) ?? 0) + 1);
  }
  const counts = inSeatOrder(table, votes.keys()).map((targetId) => ({ targetId, votes: votes.get(targetId) ?? 0 }));
  // Cần chọn đủ `bites` người, trừ khi không còn đủ người để cắn.
  const need = Math.max(1, Math.min(bites, aliveIds(table).filter((id) => !isWolf(table, id)).length));
  const first = wolves.length > 0 ? sets[wolves[0]] : [];
  const same = wolves.every((w) => sets[w].length === need && sets[w].join('\n') === first.join('\n'));
  const agreedIds = wolves.length > 0 && same ? first : null;
  const agreedId = agreedIds && agreedIds.length === 1 ? agreedIds[0] : null;
  return { wolves, picks, sets, counts, bites, agreed: wolves.length === 0 || agreedIds !== null, agreedId, agreedIds };
}

export interface WolfTally {
  /** Người bị nhắm đêm nay, hoặc null. */
  targetId: string | null;
  how: WolfTallyHow;
  counts: WolfVoteCount[];
}

export interface BiteTally {
  /** Người bị nhắm đêm nay, theo thứ tự ghế (0, 1 hoặc 2 người). */
  targetIds: string[];
  how: WolfTallyHow;
  counts: WolfVoteCount[];
  bites: WolfBites;
}

/**
 * Chốt người bị nhắm khi Đêm ① kết thúc, cho đêm cắn `bites` người (E10–E14,
 * E53): thống nhất → những người đó; không thì `bites` người nhiều phiếu nhất;
 * hoà ở ranh giới thì theo `wolfTie` ('random' bốc bằng `rng` trong số người
 * hoà, theo thứ tự ghế; 'none' chỉ cắn người chắc chắn lọt top); chỉ có ít
 * người được chọn hơn `bites` thì cắn những người đó; không ai chọn thì không cắn.
 */
export function tallyBites(
  table: WwTable,
  nightPicks: PickMap<NightPick>,
  round: number,
  wolfTie: WwRules['wolfTie'],
  rng: Rng,
  bites: WolfBites = wolfBitesFor(table, round),
): BiteTally {
  const status = wolfStatus(table, nightPicks, round, bites);
  const { counts } = status;
  const done = (targetIds: string[], how: WolfTallyHow): BiteTally => ({
    targetIds: inSeatOrder(table, targetIds),
    how,
    counts,
    bites,
  });
  if (counts.length === 0) return done([], 'none');
  if (status.agreedIds) return done(status.agreedIds, 'consensus');
  if (counts.length <= bites) return done(counts.map((c) => c.targetId), 'majority');
  // sort ổn định: cùng số phiếu thì giữ thứ tự ghế.
  const edge = [...counts].sort((a, b) => b.votes - a.votes)[bites - 1].votes;
  const sure = counts.filter((c) => c.votes > edge).map((c) => c.targetId);
  const tied = counts.filter((c) => c.votes === edge).map((c) => c.targetId);
  const slots = bites - sure.length;
  if (tied.length === slots) return done([...sure, ...tied], 'majority');
  if (wolfTie === 'none') return done(sure, 'tie-none');
  const chosen = [...sure];
  const pool = [...tied];
  for (let i = 0; i < slots; i++) {
    const id = pickOne(pool, rng);
    chosen.push(id);
    pool.splice(pool.indexOf(id), 1);
  }
  return done(chosen, 'random');
}

/**
 * Chốt mục tiêu của bầy ở đêm cắn 1 người (E10–E14): thống nhất → người đó;
 * không thì người nhiều phiếu nhất; hoà thì theo `wolfTie` ('random' bốc bằng
 * `rng` trong số người hoà, theo thứ tự ghế; 'none' không cắn); không ai chọn
 * thì không cắn. Đêm có thể cắn 2 người thì dùng `tallyBites`.
 */
export function tallyWolves(
  table: WwTable,
  nightPicks: PickMap<NightPick>,
  round: number,
  wolfTie: WwRules['wolfTie'],
  rng: Rng,
): WolfTally {
  const { targetIds, how, counts } = tallyBites(table, nightPicks, round, wolfTie, rng, 1);
  return { targetId: targetIds[0] ?? null, how, counts };
}

// ── Tiên tri, Bảo vệ, người nghi (Đêm ①) ─────────────────────────────────

export interface SeerLook {
  seerId: string;
  targetId: string;
  /** Kết quả soi "Là Sói": Ma Sói, Sói con, Người hoá sói (E33); Tay sai, Kẻ chán đời thì không (E34). */
  isWolf: boolean;
}

/**
 * Kết quả soi, tính lúc Tiên tri bấm Xác nhận và ghi vào `gameData.seerLog`
 * ngay khi đó (E15: bị cắn chết sau đó vẫn giữ kết quả). Null nếu không hợp lệ.
 */
export function seerLook(table: WwTable, seerId: string, targetId: string | null): SeerLook | null {
  if (table.roles[seerId] !== 'seer' || !isValidTarget(table, seerId, 'seer', targetId)) return null;
  const target = targetId as string;
  return { seerId, targetId: target, isWolf: seenAsWolf(table.roles[target]) };
}

/** Lần soi đêm `round` của Tiên tri còn sống (đã Xác nhận), cho "Diễn biến ván". */
export function seerLookOf(table: WwTable, nightPicks: PickMap<NightPick>, round: number): SeerLook | null {
  for (const seerId of aliveWithRole(table, 'seer')) {
    const pick = pickFor(nightPicks[seerId], round);
    if (pick?.confirmed) return seerLook(table, seerId, pick.targetId);
  }
  return null;
}

export interface GuardChoice {
  guardId: string;
  targetId: string;
}

/**
 * Người Bảo vệ còn sống che đêm `round`. Chỉ tính lựa chọn đã Xác nhận và hợp
 * lệ (khác người đã che đêm trước — E8). Hết giờ mà chưa Xác nhận thì không
 * che (E24, cùng cách với Phù thủy ở rules §5.4).
 */
export function guardChoiceOf(
  table: WwTable,
  nightPicks: PickMap<NightPick>,
  round: number,
  guardLast: string | null,
): GuardChoice | null {
  for (const guardId of aliveWithRole(table, 'guard')) {
    const pick = pickFor(nightPicks[guardId], round);
    if (pick?.confirmed && isValidTarget(table, guardId, 'guard', pick.targetId, { guardLast })) {
      return { guardId, targetId: pick.targetId as string };
    }
  }
  return null;
}

/** "Người mình nghi" của Đêm ① (mọi vai chạm lưới là "nghi", kể cả Cupid). Chỉ để tổng kết. */
export function suspectPicksOf(table: WwTable, nightPicks: PickMap<NightPick>, round: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of aliveIds(table)) {
    const role = table.roles[id];
    if (role && nightActionOf(role) !== 'suspect') continue;
    const pick = pickFor(nightPicks[id], round);
    if (pick && isValidTarget(table, id, 'suspect', pick.targetId)) out[id] = pick.targetId as string;
  }
  return out;
}

/** "Đoán Sói nhắm ai" của Đêm ② (mọi người còn sống trừ Phù thủy). Chỉ để tổng kết. */
export function guessPicksOf(table: WwTable, witchPicks: PickMap<WitchPick>, round: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of aliveIds(table)) {
    if (table.roles[id] === 'witch') continue;
    const pick = pickFor(witchPicks[id], round);
    if (pick && isValidTarget(table, id, 'guess', pick.guessId)) out[id] = pick.guessId as string;
  }
  return out;
}

// ── Cupid (rules §11.5) ──────────────────────────────────────────────────

export type CupidPickError =
  | 'not-cupid' // không phải Cupid còn sống
  | 'not-first-night' // chỉ ghép đôi ở đêm 1
  | 'need-two' // chưa chọn đúng 2 người
  | 'same-person'
  | 'lover-invalid'; // người chết / không có ghế

export const CUPID_PICK_ERROR_TEXT: Record<CupidPickError, string> = {
  'not-cupid': 'Chỉ Cupid còn sống mới ghép đôi.',
  'not-first-night': 'Cupid chỉ ghép đôi ở đêm đầu tiên.',
  'need-two': 'Chọn đúng 2 người để ghép đôi.',
  'same-person': 'Hai người trong cặp phải khác nhau.',
  'lover-invalid': 'Chỉ ghép đôi được người còn sống.',
};

/**
 * Kiểm tra cặp Cupid định ghép (dùng lúc Xác nhận; đang chọn dở 0–1 người thì
 * chưa cần gọi). 2 người khác nhau, còn sống, được gồm cả Cupid. Null = hợp lệ.
 */
export function validateCupidPick(
  table: WwTable,
  cupidId: string,
  loverIds: readonly string[] | null | undefined,
  round: number,
): CupidPickError | null {
  if (table.roles[cupidId] !== 'cupid' || !isAlive(table, cupidId)) return 'not-cupid';
  if (round !== 1) return 'not-first-night';
  const ids = loverIds ?? [];
  if (ids.length !== 2) return 'need-two';
  if (ids[0] === ids[1]) return 'same-person';
  if (!ids.every((id) => isValidTarget(table, cupidId, 'lover', id))) return 'lover-invalid';
  return null;
}

export interface CupidPair {
  cupidId: string;
  /** Theo thứ tự ghế. */
  loverIds: [string, string];
}

/**
 * Cặp đôi Cupid ghép ở đêm `round` (chỉ đêm 1, E40): Cupid còn sống lúc Đêm ①
 * kết thúc, đã Xác nhận, đã chọn đúng 2 người khác nhau còn sống. Không thì
 * ván không có cặp đôi (E41).
 */
export function cupidPairOf(table: WwTable, nightPicks: PickMap<NightPick>, round: number): CupidPair | null {
  for (const cupidId of aliveWithRole(table, 'cupid')) {
    const pick = pickFor(nightPicks[cupidId], round);
    if (!pick?.confirmed || validateCupidPick(table, cupidId, pick.loverIds, round) !== null) return null;
    const [a, b] = inSeatOrder(table, pick.loverIds as string[]);
    return { cupidId, loverIds: [a, b] };
  }
  return null;
}

// ── Phù thủy (rules §5.4, §11.7) ─────────────────────────────────────────

export type WitchPickError =
  | 'not-witch' // không phải Phù thủy còn sống
  | 'no-heal-potion'
  | 'no-attack' // đêm nay Sói không cắn ai, không có ai để cứu
  | 'heal-which' // đêm có 2 người bị nhắm: phải chọn cứu ai (`healId`)
  | 'heal-invalid' // `healId` không phải người bị nhắm
  | 'no-poison-potion'
  | 'poison-self' // E6
  | 'poison-healed' // E5: độc đúng người vừa chọn cứu
  | 'poison-invalid'; // người chết / không có ghế

export const WITCH_PICK_ERROR_TEXT: Record<WitchPickError, string> = {
  'not-witch': 'Chỉ Phù thủy còn sống mới dùng bình.',
  'no-heal-potion': 'Đã hết bình cứu.',
  'no-attack': 'Đêm nay không có ai để cứu.',
  'heal-which': 'Đêm nay Sói nhắm hai người: chọn cứu một người.',
  'heal-invalid': 'Chỉ cứu được người bị Sói nhắm.',
  'no-poison-potion': 'Đã hết bình độc.',
  'poison-self': 'Không được tự độc mình.',
  'poison-healed': 'Không được độc người vừa chọn cứu.',
  'poison-invalid': 'Chỉ độc được người còn sống.',
};

/** Người Phù thủy định cứu: `healId`, hoặc người bị nhắm duy nhất khi `heal`. */
function healTargetOf(pick: Pick<WitchPick, 'heal' | 'healId'>, attacks: readonly string[]): string | null {
  if (pick.healId) return pick.healId;
  return pick.heal && attacks.length === 1 ? attacks[0] : null;
}

/**
 * Kiểm tra quyết định của Phù thủy trước khi ghi (UI dùng để không cho chọn).
 * `attack`: người bị nhắm (một id hoặc null), hoặc danh sách ở đêm cắn 2.
 * Null = hợp lệ.
 */
export function validateWitchPick(
  table: WwTable,
  witchId: string,
  pick: Pick<WitchPick, 'heal' | 'poisonId' | 'healId'>,
  attack: string | null | readonly string[],
  potions: Potions,
): WitchPickError | null {
  if (table.roles[witchId] !== 'witch' || !isAlive(table, witchId)) return 'not-witch';
  const attacks = attackList(attack);
  if (pick.heal || pick.healId) {
    if (!potions.heal) return 'no-heal-potion';
    if (attacks.length === 0) return 'no-attack';
    if (pick.healId && !attacks.includes(pick.healId)) return 'heal-invalid';
    if (!pick.healId && attacks.length > 1) return 'heal-which';
  }
  if (pick.poisonId) {
    const healId = healTargetOf(pick, attacks);
    if (!potions.poison) return 'no-poison-potion';
    if (pick.poisonId === witchId) return 'poison-self';
    if (healId && pick.poisonId === healId) return 'poison-healed';
    if (!isAlive(table, pick.poisonId)) return 'poison-invalid';
  }
  return null;
}

export interface WitchAction {
  witchId: string;
  /** Người được cứu (một trong những người bị nhắm), hoặc null. */
  healedId: string | null;
  poisonId: string | null;
}

/**
 * Quyết định của Phù thủy còn sống đêm `round`, đã lọc phần không hợp lệ. Chưa
 * Xác nhận thì coi như không làm gì (rules §5.4). Phù thủy đã chết hoặc hết
 * bình thì không cứu, không độc (E26). Chọn cứu X rồi độc X thì bỏ phần độc
 * (E5). Đêm có 2 người bị nhắm thì chỉ cứu được người ghi ở `healId`.
 */
export function witchActionOf(
  table: WwTable,
  witchPicks: PickMap<WitchPick>,
  round: number,
  attack: string | null | readonly string[],
  potions: Potions,
): WitchAction | null {
  for (const witchId of aliveWithRole(table, 'witch')) {
    const pick = pickFor(witchPicks[witchId], round);
    if (!pick?.confirmed) return null;
    const attacks = attackList(attack).filter((id) => isAlive(table, id));
    const target = healTargetOf(pick, attacks);
    const healedId = potions.heal && target && attacks.includes(target) ? target : null;
    const poisonId =
      pick.poisonId && potions.poison && isValidTarget(table, witchId, 'poison', pick.poisonId, { healId: healedId })
        ? pick.poisonId
        : null;
    if (!healedId && !poisonId) return null;
    return { witchId, healedId, poisonId };
  }
  return null;
}

// ── Tính kết quả đêm (rules §5.5, §11.2, §11.5, §11.7) ───────────────────

export interface NightInput {
  table: WwTable;
  round: number;
  /** Người bị nhắm, đã chốt khi Đêm ① kết thúc (tallyWolves). Đêm cắn 2 dùng `attacks`. */
  attack: string | null;
  /** Mọi người bị nhắm (tallyBites, tối đa 2). Có thì dùng thay cho `attack`. */
  attacks?: readonly string[] | null;
  nightPicks: PickMap<NightPick>;
  witchPicks: PickMap<WitchPick>;
  /** Bình còn lại của Phù thủy trước đêm nay (`gameData.potions`). */
  potions: Potions;
  /** Người Bảo vệ đã che đêm trước (`gameData.guardLast`). */
  guardLast: string | null;
  /** Già làng còn mạng phụ trước đêm nay không (`gameData.elderLife`). Thiếu = còn. */
  elderLife?: boolean;
}

export interface NightResult {
  /** Người chết đêm nay, theo thứ tự ghế (E21, E42), để nối vào `state.deaths`. */
  newDeaths: WwDeath[];
  /** Id người chết đêm nay, theo thứ tự ghế: công bố ở bình minh, không nói nguyên nhân. */
  dawnDeaths: string[];
  /** Người bị nhắm đầu tiên (theo ghế), hoặc null. Đêm thường thì đây là người bị nhắm. */
  attack: string | null;
  /** Mọi người bị nhắm còn hiệu lực (còn sống, không phải Sói), theo ghế. */
  attacks: string[];
  guard: GuardChoice | null;
  witch: WitchAction | null;
  /** Bình còn lại sau đêm nay: bình đã dùng thì mất, kể cả khi người được cứu vốn đã được che (E2). */
  potions: Potions;
  /** Ghi vào `gameData.guardLast` của Bảo vệ: người che đêm nay, hoặc null. */
  guardLast: string | null;
  /** Ghi vào `gameData.elderLife` của Già làng: còn mạng phụ sau đêm nay không. */
  elderLife: boolean;
  /** Già làng mất mạng phụ đêm nay (bị cắn trúng lần đầu — E29, E54), hoặc null. */
  elderHitId: string | null;
}

/**
 * Người bị nhắm sống nếu được che hoặc được cứu; Già làng còn mạng phụ thì
 * mất mạng phụ thay vì chết; còn lại chết ("Sói"). Người bị độc chết ("độc"),
 * che không chặn được. Bị nhắm mà không được cứu và cũng bị độc thì chết một
 * lần, nguyên nhân "độc". Người yêu của người chết đêm nay chết theo ("love")
 * (E1–E9, E21, E26, E29–E32, E42, E52, E54).
 */
export function resolveNight(input: NightInput): NightResult {
  const { table, round, nightPicks, witchPicks, potions, guardLast } = input;
  const attacks = inSeatOrder(
    table,
    attackList(input.attacks ?? input.attack).filter((id) => isAlive(table, id) && !isWolf(table, id)),
  );
  const guard = guardChoiceOf(table, nightPicks, round, guardLast);
  const witch = witchActionOf(table, witchPicks, round, attacks, potions);

  const causes = new Map<string, DeathCause>();
  if (witch?.poisonId) causes.set(witch.poisonId, 'poison');
  let elderLife = input.elderLife ?? true;
  let elderHitId: string | null = null;
  for (const id of attacks) {
    if (causes.has(id) || guard?.targetId === id || witch?.healedId === id) continue;
    if (table.roles[id] === 'elder' && elderLife) {
      elderLife = false;
      elderHitId = id;
      continue;
    }
    causes.set(id, 'wolf');
  }
  const direct: WwDeath[] = [...causes].map(([id, cause]) => ({ id, round, cause }));
  const all = [...direct, ...loveDeaths(table, direct, round)];
  const dawnDeaths = inSeatOrder(table, all.map((d) => d.id));
  return {
    newDeaths: dawnDeaths.map((id) => all.find((d) => d.id === id) as WwDeath),
    dawnDeaths,
    attack: attacks[0] ?? null,
    attacks,
    guard,
    witch,
    potions: {
      heal: potions.heal && !witch?.healedId,
      poison: potions.poison && !witch?.poisonId,
    },
    guardLast: guard?.targetId ?? null,
    elderLife,
    elderHitId,
  };
}
