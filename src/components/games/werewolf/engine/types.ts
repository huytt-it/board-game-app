// Kiểu dữ liệu dùng chung giữa engine và UI. Engine thuần (plan §2.4): không
// React, không Firebase, không alias `@/`, chỉ cú pháp TS xoá được, import
// tương đối có đuôi `.ts`. `werewolf/types.ts` (GĐ1) import ngược lại từ đây.
//
// Mọi giá trị engine trả về để ghi vào Firestore dùng `null`, không dùng
// `undefined` (Firestore từ chối `undefined`).

export type WwRole = 'werewolf' | 'villager' | 'seer' | 'guard' | 'witch' | 'hunter';
export type WwTeam = 'wolves' | 'village';

export type WwPhase =
  | 'deal'
  | 'night'
  | 'night-witch'
  | 'dawn'
  | 'hunter'
  | 'day-talk'
  | 'day-vote'
  | 'vote-result'
  | 'end';

/** Nguyên nhân chết, chỉ hiện ở màn kết thúc (rules §5.6). */
export type DeathCause = 'wolf' | 'poison' | 'vote' | 'hunter' | 'left';

export interface WwDeath {
  id: string;
  round: number;
  cause: DeathCause;
}

/** Luật tuỳ chọn (rules §8.2), chép từ cài đặt phòng lúc bắt đầu ván. */
export interface WwRules {
  revealOnDeath: boolean;
  ghostsSeeAll: boolean;
  wolfTie: 'random' | 'none';
  hunterShootsWhenPoisoned: boolean;
}

export const DEFAULT_RULES: WwRules = {
  revealOnDeath: true,
  ghostsSeeAll: true,
  wolfTie: 'random',
  hunterShootsWhenPoisoned: false,
};

/** Số lượng từng vai. Không bao giờ lưu vai theo thứ tự ghế (plan §2.3). */
export type RoleCounts = Partial<Record<WwRole, number>>;

/** Hàm ngẫu nhiên trả về số trong [0, 1), được truyền vào để test được. */
export type Rng = () => number;

/**
 * Bàn chơi mà engine cần để quyết định: thứ tự ghế, vai của từng người (UI
 * dựng từ `players/<id>.gameData.role`) và danh sách người chết
 * (`state.deaths`, nguồn sự thật sống/chết).
 */
export interface WwTable {
  seatOrder: string[];
  roles: Record<string, WwRole>;
  deaths: WwDeath[];
}

/** Lựa chọn Đêm ① của một người (`gameData.nightPick`). */
export interface NightPick {
  round: number;
  targetId: string | null;
  confirmed: boolean;
}

/**
 * Lựa chọn Đêm ② (`gameData.witchPick`). Với Phù thủy: `heal` (cứu người bị
 * nhắm) và `poisonId`. Với người khác: `guessId` (đoán Sói nhắm ai).
 */
export interface WitchPick {
  round: number;
  heal: boolean;
  poisonId: string | null;
  guessId: string | null;
  confirmed: boolean;
}

/** Bình còn lại của Phù thủy (`gameData.potions`). */
export interface Potions {
  heal: boolean;
  poison: boolean;
}

export const FULL_POTIONS: Potions = { heal: true, poison: true };

/** Lựa chọn của mọi người, theo id. Thiếu = chưa chọn. */
export type PickMap<T> = Record<string, T | null | undefined>;

/** Phiếu ban ngày: id người bầu → id người bị bầu, hoặc 'skip'. */
export type DayBallot = string | 'skip';

/** Lượt bắn của Thợ săn: ai bắn, và bắn sau bình minh hay sau khi treo. */
export interface HunterTurn {
  hunterId: string;
  after: 'dawn' | 'vote';
}

export type WinReason = 'no-wolves' | 'wolf-parity';

export interface WinResult {
  winner: WwTeam;
  reason: WinReason;
}

/** Cách bầy Sói chốt mục tiêu (rules §5.3). */
export type WolfTallyHow =
  | 'consensus' // mọi Sói còn sống chọn cùng một người
  | 'majority' // hết giờ, có người nhiều phiếu nhất
  | 'random' // hoà, bốc ngẫu nhiên trong số người hoà
  | 'tie-none' // hoà, cài đặt "Không cắn"
  | 'none'; // không Sói nào chọn

/** Một mục "Diễn biến ván" (rules §5.10). */
export type WwLogEntry =
  | { kind: 'wolves'; round: number; targetId: string | null; how: WolfTallyHow }
  | { kind: 'guard'; round: number; guardId: string; targetId: string }
  | { kind: 'seer'; round: number; seerId: string; targetId: string; isWolf: boolean }
  | { kind: 'witch'; round: number; witchId: string; healedId: string | null; poisonId: string | null }
  | { kind: 'death'; round: number; id: string; cause: DeathCause }
  | { kind: 'suspects'; round: number; picks: Record<string, string> }
  | { kind: 'guesses'; round: number; picks: Record<string, string> }
  | { kind: 'vote'; round: number; ballots: Record<string, DayBallot>; executedId: string | null }
  | { kind: 'hunter'; round: number; hunterId: string; targetId: string | null }
  | { kind: 'left'; round: number; id: string; during: WwPhase };
