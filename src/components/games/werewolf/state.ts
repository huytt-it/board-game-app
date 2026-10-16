// Đọc dữ liệu phòng cho Ma Sói: state, cài đặt, bàn chơi cho engine. Hàm
// thuần, không Firebase, để WerewolfBoard, useWerewolf và WerewolfPreview
// dùng chung.

import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import { fullCounts, presetFor, MAX_PLAYERS, MIN_PLAYERS } from '@/components/games/werewolf/engine/roles.ts';
import { DEFAULT_RULES, FULL_POTIONS } from '@/components/games/werewolf/engine/types.ts';
import {
  PHASE_SECONDS_LIMITS,
  TIMED_PHASES,
  type NightPick,
  type Potions,
  type RoleCounts,
  type TimedPhase,
  type WerewolfGameData,
  type WerewolfGameState,
  type WwPhase,
  type WwRole,
  type WwRules,
  type WitchPick,
  type WwTable,
} from './types';

export function readState(room: Room): WerewolfGameState | null {
  const gs = room.gameState as unknown as WerewolfGameState | undefined;
  return gs && gs.phase ? gs : null;
}

export function dataOf(player: Player | undefined): Partial<WerewolfGameData> {
  return (player?.gameData as Partial<WerewolfGameData> | undefined) ?? {};
}

// ── Cài đặt phòng ────────────────────────────────────────────────────────

export interface WwConfig {
  /** Số Sói / vai đặc biệt chủ phòng đã chỉnh, hoặc null = bộ mặc định. */
  roleCounts: RoleCounts | null;
  rules: WwRules;
  phaseSeconds: Record<TimedPhase, number>;
}

export function readConfig(room: Room): WwConfig {
  const cfg = room.config as Record<string, unknown>;
  const rc = cfg.roleCounts;
  return {
    roleCounts: rc && typeof rc === 'object' ? (rc as RoleCounts) : null,
    rules: readRules(cfg.rules),
    phaseSeconds: readPhaseSeconds(cfg.phaseSeconds),
  };
}

function readRules(raw: unknown): WwRules {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const bool = (key: keyof WwRules) => (typeof src[key] === 'boolean' ? (src[key] as boolean) : (DEFAULT_RULES[key] as boolean));
  return {
    revealOnDeath: bool('revealOnDeath'),
    ghostsSeeAll: bool('ghostsSeeAll'),
    wolfTie: src.wolfTie === 'none' ? 'none' : 'random',
    hunterShootsWhenPoisoned: bool('hunterShootsWhenPoisoned'),
  };
}

// Một số thì làm tròn theo bước nhảy và kẹp trong giới hạn; còn lại (thiếu,
// rác) là mặc định. Giống Avalon GĐ8.
function readPhaseSeconds(raw: unknown): Record<TimedPhase, number> {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<TimedPhase, number>;
  for (const phase of TIMED_PHASES) {
    const { min, max, step, def } = PHASE_SECONDS_LIMITS[phase];
    const v = src[phase];
    out[phase] =
      typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, min + Math.round((v - min) / step) * step)) : def;
  }
  return out;
}

/** Thời lượng (ms) một ván mới chốt (state.timeouts). */
export function timeoutsFor(phaseSeconds: Record<TimedPhase, number>): Partial<Record<WwPhase, number>> {
  return Object.fromEntries(TIMED_PHASES.map((p) => [p, phaseSeconds[p] * 1000]));
}

// ── Bộ vai ở sảnh ────────────────────────────────────────────────────────

/**
 * Bộ vai cho `n` người: số Sói và vai đặc biệt chủ phòng đã chỉnh (không có
 * thì theo bộ mặc định), Dân làng là phần còn lại. Bắt đầu ván vẫn kiểm tra
 * bằng validateSetup (E28).
 */
export function lobbyCounts(roleCounts: RoleCounts | null, n: number): Record<WwRole, number> {
  const clamped = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
  const out = fullCounts(roleCounts ?? presetFor(clamped) ?? {});
  const others = out.werewolf + out.seer + out.guard + out.witch + out.hunter;
  out.villager = Math.max(0, n - others);
  return out;
}

// ── Bàn chơi cho engine ──────────────────────────────────────────────────

/**
 * `WwTable` của ván: ghế và người chết từ state, vai từ `players/<id>.gameData.role`.
 * `ready` = mọi ghế đã có vai; chưa đủ thì không được quyết định gì (isWolf sẽ sai).
 */
export function tableOf(state: WerewolfGameState, players: Player[]): { table: WwTable; ready: boolean } {
  const byId = new Map(players.map((p) => [p.id, p]));
  const roles: Record<string, WwRole> = {};
  let ready = true;
  for (const id of state.seatOrder) {
    const role = dataOf(byId.get(id)).role;
    if (role) roles[id] = role;
    else ready = false;
  }
  return { table: { seatOrder: state.seatOrder, roles, deaths: state.deaths ?? [] }, ready };
}

/** Lựa chọn Đêm ① của mọi ghế (thiếu = null), đọc thẳng từ gameData. */
export function nightPicksOf(state: WerewolfGameState, players: Player[]): Record<string, NightPick | null> {
  const byId = new Map(players.map((p) => [p.id, p]));
  return Object.fromEntries(state.seatOrder.map((id) => [id, dataOf(byId.get(id)).nightPick ?? null]));
}

/** Lựa chọn Đêm ② của mọi ghế (thiếu = null), đọc thẳng từ gameData. */
export function witchPicksOf(state: WerewolfGameState, players: Player[]): Record<string, WitchPick | null> {
  const byId = new Map(players.map((p) => [p.id, p]));
  return Object.fromEntries(state.seatOrder.map((id) => [id, dataOf(byId.get(id)).witchPick ?? null]));
}

/** Người giữ vai `role` trong ván (kể cả đã chết), hoặc null. Vai đặc biệt chỉ có tối đa 1 người. */
export function holderOf(table: WwTable, role: WwRole): string | null {
  return table.seatOrder.find((id) => table.roles[id] === role) ?? null;
}

/** Bình còn lại của Phù thủy. Bắt đầu ván luôn ghi đủ hai bình. */
export function potionsOf(data: Partial<WerewolfGameData>): Potions {
  return data.potions ?? FULL_POTIONS;
}

/** Người chơi theo thứ tự ghế (bỏ ghế không còn doc). */
export function seated(state: WerewolfGameState, players: Player[]): Player[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return state.seatOrder.map((id) => byId.get(id)).filter((p): p is Player => !!p);
}

export function isDead(state: WerewolfGameState, id: string): boolean {
  return (state.deaths ?? []).some((d) => d.id === id);
}
