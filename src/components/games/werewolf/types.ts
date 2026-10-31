// Kiểu dữ liệu của Ma Sói ở phía UI / Firestore (plan §4.3). Kiểu của luật
// (vai, phe, phase, người chết, lựa chọn…) nằm trong engine/types.ts và chỉ
// được import lại ở đây, không định nghĩa lại.

import type { BaseGameData } from '@/types/player';
import type { RoomStatus } from '@/types/room';
import type { DayVoteOutcome } from '@/components/games/werewolf/engine/day.ts';
import type {
  DayBallot,
  HunterTurn,
  NightPick,
  Potions,
  RoleCounts,
  WinReason,
  WitchPick,
  WwDeath,
  WwLogEntry,
  WwPhase,
  WwRole,
  WwRules,
  WwTeam,
} from '@/components/games/werewolf/engine/types.ts';

export type {
  DayBallot,
  DeathCause,
  HunterTurn,
  NightPick,
  Potions,
  RoleCounts,
  WinReason,
  WitchPick,
  WwDeath,
  WwLogEntry,
  WwPhase,
  WwRole,
  WwRules,
  WwTable,
  WwTeam,
} from '@/components/games/werewolf/engine/types.ts';

// ── Thời gian các bước (rules §8.3) ──────────────────────────────────────

/** Sáu bước chủ phòng chỉnh được thời lượng. Bình minh và Kết quả phiếu cố định 8 giây. */
export type TimedPhase = 'deal' | 'night' | 'night-witch' | 'hunter' | 'day-talk' | 'day-vote';

/** Giây: cận và bước nhảy của stepper ở sảnh, và mặc định (= PHASE_TIMEOUTS_MS). */
export const PHASE_SECONDS_LIMITS: Record<TimedPhase, { min: number; max: number; step: number; def: number }> = {
  deal: { min: 30, max: 180, step: 15, def: 60 },
  night: { min: 20, max: 120, step: 5, def: 45 },
  'night-witch': { min: 10, max: 60, step: 5, def: 20 },
  hunter: { min: 10, max: 60, step: 5, def: 30 },
  'day-talk': { min: 60, max: 1200, step: 30, def: 180 },
  'day-vote': { min: 15, max: 120, step: 15, def: 45 },
};

export const TIMED_PHASES = Object.keys(PHASE_SECONDS_LIMITS) as TimedPhase[];

export const PHASE_TIMEOUTS_MS: Record<WwPhase, number> = {
  deal: 60_000,
  night: 45_000,
  'night-witch': 20_000,
  dawn: 8_000,
  hunter: 30_000,
  'day-talk': 180_000,
  'day-vote': 45_000,
  'vote-result': 8_000,
  end: 0,
};

/** Thời lượng của `phase` trong ván này: số đã chốt lúc bắt đầu ván, không có thì mặc định.
 *  Hàm DUY NHẤT đọc PHASE_TIMEOUTS_MS. */
export function phaseTimeoutMs(state: Pick<WerewolfGameState, 'phase' | 'timeouts'>, phase: WwPhase = state.phase): number {
  return state.timeouts?.[phase] ?? PHASE_TIMEOUTS_MS[phase];
}

/** `room.status` của từng phase (plan §4.2). */
export const PHASE_STATUS: Record<WwPhase, RoomStatus> = {
  deal: 'night',
  night: 'night',
  'night-witch': 'night',
  dawn: 'day',
  hunter: 'day',
  'day-talk': 'day',
  'day-vote': 'voting',
  'vote-result': 'voting',
  end: 'end',
};

// ── Cài đặt phòng (room.config) ──────────────────────────────────────────

export interface WerewolfRoomConfig {
  /**
   * Số Sói và vai đặc biệt chủ phòng đã chỉnh; Dân làng luôn = số người − các
   * vai còn lại. Thiếu (hoặc null) = bộ mặc định theo số người.
   */
  roleCounts?: RoleCounts | null;
  rules?: Partial<WwRules>;
  /** Giây cho từng bước chỉnh được; thiếu = mặc định. */
  phaseSeconds?: Partial<Record<TimedPhase, number>>;
}

// ── room.gameState ───────────────────────────────────────────────────────

/** Kết quả phiếu công khai ở bước Kết quả (rules §5.9). */
export interface WwLastVote {
  /** Phiếu của mọi người còn sống lúc kiểm (không bầu = 'skip'). */
  ballots: Record<string, DayBallot>;
  executedId: string | null;
  outcome: DayVoteOutcome;
}

export interface WerewolfGameState {
  phase: WwPhase;
  phaseStartedAt: number;
  /** Đêm 1 / ngày 1 = 1; `deal` là 0; tăng khi vào `night`. */
  round: number;
  seatOrder: string[];
  /** Số lượng từng vai của ván. KHÔNG lưu vai theo ghế (plan §2.3). */
  roleCounts: Record<WwRole, number>;
  /** Chép từ cài đặt lúc bắt đầu, cố định cả ván. */
  rules: WwRules;
  /** Thời lượng (ms) chép từ cài đặt lúc bắt đầu, cố định cả ván (phaseTimeoutMs). */
  timeouts: Partial<Record<WwPhase, number>>;
  /** Nguồn sự thật sống/chết, ghi cùng transaction với lần đổi phase. */
  deaths: WwDeath[];
  /** Đã xem vai / sẵn sàng bỏ phiếu; về rỗng mỗi lần đổi phase. */
  acks: Record<string, boolean>;
  /** Người bị Sói nhắm đêm nay (chốt khi hết Đêm ①); đêm cắn 2 là người đầu (theo ghế). */
  attack: string | null;
  /**
   * Mọi người bị Sói nhắm đêm nay, theo ghế (đêm cắn 2: tối đa 2 — rules §11.7).
   * Ván cũ (trước GĐ5b) không có trường này: đọc qua `attacksOf`.
   */
  attacks?: string[];
  /**
   * Cặp đôi Cupid đã ghép (rules §11.5), theo ghế; chốt khi hết Đêm ① của đêm 1.
   * null / thiếu = ván không có cặp đôi.
   */
  lovers?: [string, string] | null;
  /** Người chết đêm qua, theo thứ tự ghế (công bố ở Bình minh, không nói nguyên nhân). */
  dawnDeaths: string[];
  /** Phiếu ban ngày: người bầu → người bị bầu | 'skip'. Bầu ai thì ẩn đến Kết quả. */
  dayVotes: Record<string, DayBallot>;
  lastVote: WwLastVote | null;
  hunter: HunterTurn | null;
  winner: WwTeam | null;
  endReason: WinReason | null;
  /** "Diễn biến ván": lộ hết vai và lựa chọn, chỉ hiện ở màn kết thúc. */
  log: WwLogEntry[];
}

// ── players/<id>.gameData ────────────────────────────────────────────────

export interface WwSeerLook {
  round: number;
  targetId: string;
  isWolf: boolean;
}

export interface WerewolfGameData extends BaseGameData {
  role: WwRole;
  team: WwTeam;
  /** Đêm ①. Có `round`, nên lựa chọn đêm trước không bị tính sang đêm sau (đọc qua pickFor). */
  nightPick?: NightPick | null;
  /** Đêm ② (đọc qua pickFor như nightPick). Phù thủy: cứu / độc; người khác: đoán Sói nhắm ai. */
  witchPick?: WitchPick | null;
  /** Phù thủy: bình còn lại (ghi lại khi Đêm ② kết thúc). */
  potions?: Potions | null;
  /** Bảo vệ: người đã che đêm trước. */
  guardLast?: string | null;
  /** Tiên tri: kết quả soi, ghi lúc Xác nhận (E15). */
  seerLog?: WwSeerLook[];
  /**
   * Già làng: còn mạng phụ không (rules §11.2). Thiếu / null = còn. Ghi lại
   * cùng transaction cuối đêm, như `potions`.
   */
  elderLife?: boolean | null;
}
