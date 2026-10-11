// Ban đêm: ai được chọn ai, bầy Sói thống nhất, tính kết quả đêm
// (rules §5.2–§5.5, §7).
//
// Lựa chọn mang `round`: lựa chọn của đêm trước không bao giờ bị tính sang đêm
// sau, nên không phải xoá chúng khi đổi phase (plan §4.3).

import { pickOne } from './random.ts';
import { aliveIds, aliveWithRole, inSeatOrder, isAlive, isWolf } from './table.ts';
import type {
  NightPick,
  PickMap,
  Potions,
  Rng,
  WitchPick,
  WolfTallyHow,
  WwDeath,
  WwRules,
  WwTable,
} from './types.ts';

/** Lựa chọn của đúng đêm `round`, hoặc null. */
export function pickFor<T extends { round: number }>(pick: T | null | undefined, round: number): T | null {
  return pick && pick.round === round ? pick : null;
}

// ── Ai được chọn ai ──────────────────────────────────────────────────────

/**
 * Loại lựa chọn:
 * - `wolf`: Sói cắn (người sống, không phải Sói — E14);
 * - `seer`: Tiên tri soi (người sống khác mình);
 * - `guard`: Bảo vệ che (người sống, được tự che, khác người đã che đêm trước — E8);
 * - `suspect`: "người mình nghi" ở Đêm ① (người sống khác mình);
 * - `guess`: đoán Sói nhắm ai ở Đêm ② (người sống, kể cả mình);
 * - `poison`: Phù thủy độc (người sống khác mình, khác người vừa chọn cứu — E5, E6);
 * - `vote`: phiếu ban ngày (người sống khác mình — E23);
 * - `shoot`: Thợ săn bắn (người sống; Thợ săn đã chết nên không tự bắn được).
 */
export type TargetKind = 'wolf' | 'seer' | 'guard' | 'suspect' | 'guess' | 'poison' | 'vote' | 'shoot';

export interface TargetContext {
  /** `guard`: người Bảo vệ đã che đêm trước. */
  guardLast?: string | null;
  /** `poison`: người bị Sói nhắm đêm nay. */
  attack?: string | null;
  /** `poison`: Phù thủy đang chọn cứu người bị nhắm. */
  healing?: boolean;
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
      return alive;
    case 'poison':
      return alive.filter((id) => id !== actorId && !(ctx.healing && id === (ctx.attack ?? null)));
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

// ── Bầy Sói (rules §5.3) ─────────────────────────────────────────────────

export interface WolfVoteCount {
  targetId: string;
  votes: number;
}

export interface WolfStatus {
  /** Sói còn sống, theo thứ tự ghế. */
  wolves: string[];
  /** Lựa chọn hợp lệ của từng Sói còn sống (null = chưa chọn / chọn sai). */
  picks: Record<string, string | null>;
  /** Phiếu theo mục tiêu, theo thứ tự ghế của mục tiêu. */
  counts: WolfVoteCount[];
  /**
   * Mọi Sói còn sống đang chọn cùng một người (E13: còn một Sói thì lựa chọn
   * của nó là thống nhất). Không còn Sói thì coi như thống nhất, để đêm không bị chặn.
   */
  agreed: boolean;
  /** Người cả bầy đã thống nhất, hoặc null. */
  agreedId: string | null;
}

/**
 * Trạng thái bầy Sói lúc này: dùng cho màn của Sói ("Bầy chưa thống nhất:
 * Lan (1) · Minh (1)") và cho điều kiện kết thúc sớm. Mọi lựa chọn đang có
 * đều được tính, đã Xác nhận hay chưa. Sói đã chết / rời làng không còn được
 * tính (E25).
 */
export function wolfStatus(table: WwTable, nightPicks: PickMap<NightPick>, round: number): WolfStatus {
  const wolves = aliveIds(table).filter((id) => isWolf(table, id));
  const picks: Record<string, string | null> = {};
  const votes = new Map<string, number>();
  for (const wolfId of wolves) {
    const pick = pickFor(nightPicks[wolfId], round);
    const target = pick && isValidTarget(table, wolfId, 'wolf', pick.targetId) ? pick.targetId : null;
    picks[wolfId] = target;
    if (target) votes.set(target, (votes.get(target) ?? 0) + 1);
  }
  const counts = inSeatOrder(table, votes.keys()).map((targetId) => ({ targetId, votes: votes.get(targetId) ?? 0 }));
  const agreedId = counts.length === 1 && counts[0].votes === wolves.length ? counts[0].targetId : null;
  return { wolves, picks, counts, agreed: wolves.length === 0 || agreedId !== null, agreedId };
}

export interface WolfTally {
  /** Người bị nhắm đêm nay, hoặc null. */
  targetId: string | null;
  how: WolfTallyHow;
  counts: WolfVoteCount[];
}

/**
 * Chốt mục tiêu của bầy khi Đêm ① kết thúc (E10–E14): thống nhất → người đó;
 * không thì người nhiều phiếu nhất; hoà thì theo `wolfTie` ('random' bốc bằng
 * `rng` trong số người hoà, theo thứ tự ghế; 'none' không cắn); không ai chọn
 * thì không cắn.
 */
export function tallyWolves(
  table: WwTable,
  nightPicks: PickMap<NightPick>,
  round: number,
  wolfTie: WwRules['wolfTie'],
  rng: Rng,
): WolfTally {
  const status = wolfStatus(table, nightPicks, round);
  const { counts } = status;
  if (counts.length === 0) return { targetId: null, how: 'none', counts };
  if (status.agreedId) return { targetId: status.agreedId, how: 'consensus', counts };
  const top = Math.max(...counts.map((c) => c.votes));
  const leaders = counts.filter((c) => c.votes === top).map((c) => c.targetId);
  if (leaders.length === 1) return { targetId: leaders[0], how: 'majority', counts };
  if (wolfTie === 'none') return { targetId: null, how: 'tie-none', counts };
  return { targetId: pickOne(leaders, rng), how: 'random', counts };
}

// ── Tiên tri, Bảo vệ, người nghi (Đêm ①) ─────────────────────────────────

export interface SeerLook {
  seerId: string;
  targetId: string;
  isWolf: boolean;
}

/**
 * Kết quả soi, tính lúc Tiên tri bấm Xác nhận và ghi vào `gameData.seerLog`
 * ngay khi đó (E15: bị cắn chết sau đó vẫn giữ kết quả). Null nếu không hợp lệ.
 */
export function seerLook(table: WwTable, seerId: string, targetId: string | null): SeerLook | null {
  if (table.roles[seerId] !== 'seer' || !isValidTarget(table, seerId, 'seer', targetId)) return null;
  return { seerId, targetId: targetId as string, isWolf: isWolf(table, targetId as string) };
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

/** "Người mình nghi" của Đêm ① (mọi vai không phải Sói / Tiên tri / Bảo vệ). Chỉ để tổng kết. */
export function suspectPicksOf(table: WwTable, nightPicks: PickMap<NightPick>, round: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of aliveIds(table)) {
    const role = table.roles[id];
    if (role === 'werewolf' || role === 'seer' || role === 'guard') continue;
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

// ── Phù thủy (rules §5.4) ────────────────────────────────────────────────

export type WitchPickError =
  | 'not-witch' // không phải Phù thủy còn sống
  | 'no-heal-potion'
  | 'no-attack' // đêm nay Sói không cắn ai, không có ai để cứu
  | 'no-poison-potion'
  | 'poison-self' // E6
  | 'poison-healed' // E5: độc đúng người vừa chọn cứu
  | 'poison-invalid'; // người chết / không có ghế

export const WITCH_PICK_ERROR_TEXT: Record<WitchPickError, string> = {
  'not-witch': 'Chỉ Phù thủy còn sống mới dùng bình.',
  'no-heal-potion': 'Đã hết bình cứu.',
  'no-attack': 'Đêm nay không có ai để cứu.',
  'no-poison-potion': 'Đã hết bình độc.',
  'poison-self': 'Không được tự độc mình.',
  'poison-healed': 'Không được độc người vừa chọn cứu.',
  'poison-invalid': 'Chỉ độc được người còn sống.',
};

/** Kiểm tra quyết định của Phù thủy trước khi ghi (UI dùng để không cho chọn). Null = hợp lệ. */
export function validateWitchPick(
  table: WwTable,
  witchId: string,
  pick: Pick<WitchPick, 'heal' | 'poisonId'>,
  attack: string | null,
  potions: Potions,
): WitchPickError | null {
  if (table.roles[witchId] !== 'witch' || !isAlive(table, witchId)) return 'not-witch';
  if (pick.heal) {
    if (!potions.heal) return 'no-heal-potion';
    if (!attack) return 'no-attack';
  }
  if (pick.poisonId) {
    if (!potions.poison) return 'no-poison-potion';
    if (pick.poisonId === witchId) return 'poison-self';
    if (pick.heal && pick.poisonId === attack) return 'poison-healed';
    if (!isAlive(table, pick.poisonId)) return 'poison-invalid';
  }
  return null;
}

export interface WitchAction {
  witchId: string;
  /** Người được cứu (= người bị nhắm), hoặc null. */
  healedId: string | null;
  poisonId: string | null;
}

/**
 * Quyết định của Phù thủy còn sống đêm `round`, đã lọc phần không hợp lệ. Chưa
 * Xác nhận thì coi như không làm gì (rules §5.4). Phù thủy đã chết hoặc hết
 * bình thì không cứu, không độc (E26). Chọn cứu X rồi độc X thì bỏ phần độc (E5).
 */
export function witchActionOf(
  table: WwTable,
  witchPicks: PickMap<WitchPick>,
  round: number,
  attack: string | null,
  potions: Potions,
): WitchAction | null {
  for (const witchId of aliveWithRole(table, 'witch')) {
    const pick = pickFor(witchPicks[witchId], round);
    if (!pick?.confirmed) return null;
    const healedId = pick.heal && potions.heal && attack && isAlive(table, attack) ? attack : null;
    const poisonId =
      pick.poisonId &&
      potions.poison &&
      isValidTarget(table, witchId, 'poison', pick.poisonId, { attack, healing: healedId !== null })
        ? pick.poisonId
        : null;
    if (!healedId && !poisonId) return null;
    return { witchId, healedId, poisonId };
  }
  return null;
}

// ── Tính kết quả đêm (rules §5.5) ────────────────────────────────────────

export interface NightInput {
  table: WwTable;
  round: number;
  /** Người bị nhắm, đã chốt khi Đêm ① kết thúc (tallyWolves). */
  attack: string | null;
  nightPicks: PickMap<NightPick>;
  witchPicks: PickMap<WitchPick>;
  /** Bình còn lại của Phù thủy trước đêm nay (`gameData.potions`). */
  potions: Potions;
  /** Người Bảo vệ đã che đêm trước (`gameData.guardLast`). */
  guardLast: string | null;
}

export interface NightResult {
  /** Người chết đêm nay, theo thứ tự ghế (E21), để nối vào `state.deaths`. */
  newDeaths: WwDeath[];
  /** Id người chết đêm nay, theo thứ tự ghế: công bố ở bình minh, không nói nguyên nhân. */
  dawnDeaths: string[];
  attack: string | null;
  guard: GuardChoice | null;
  witch: WitchAction | null;
  /** Bình còn lại sau đêm nay: bình đã dùng thì mất, kể cả khi người được cứu vốn đã được che (E2). */
  potions: Potions;
  /** Ghi vào `gameData.guardLast` của Bảo vệ: người che đêm nay, hoặc null. */
  guardLast: string | null;
}

/**
 * Người bị nhắm sống nếu được che hoặc được cứu, không thì chết ("Sói"). Người
 * bị độc chết ("độc"), che không chặn được. Bị nhắm mà không được cứu và cũng
 * bị độc thì chết một lần, nguyên nhân "độc" (E1–E9, E21, E26).
 */
export function resolveNight(input: NightInput): NightResult {
  const { table, round, nightPicks, witchPicks, potions, guardLast } = input;
  const attack = input.attack && isAlive(table, input.attack) && !isWolf(table, input.attack) ? input.attack : null;
  const guard = guardChoiceOf(table, nightPicks, round, guardLast);
  const witch = witchActionOf(table, witchPicks, round, attack, potions);

  const saved = attack !== null && (guard?.targetId === attack || witch?.healedId === attack);
  const causes = new Map<string, WwDeath['cause']>();
  if (attack && !saved) causes.set(attack, 'wolf');
  if (witch?.poisonId) causes.set(witch.poisonId, 'poison');

  const dawnDeaths = inSeatOrder(table, causes.keys());
  return {
    newDeaths: dawnDeaths.map((id) => ({ id, round, cause: causes.get(id) as WwDeath['cause'] })),
    dawnDeaths,
    attack,
    guard,
    witch,
    potions: {
      heal: potions.heal && !witch?.healedId,
      poison: potions.poison && !witch?.poisonId,
    },
    guardLast: guard?.targetId ?? null,
  };
}
