// Kiểu dữ liệu dùng chung giữa engine và UI. Engine thuần (plan §2.4): không
// React, không Firebase, không alias `@/`, chỉ cú pháp TS xoá được, import
// tương đối có đuôi `.ts`. `werewolf/types.ts` (GĐ1) import ngược lại từ đây.
//
// Mọi giá trị engine trả về để ghi vào Firestore dùng `null`, không dùng
// `undefined` (Firestore từ chối `undefined`).

/** 6 vai gốc (v1, rules §3). */
export type BaseRole = 'werewolf' | 'villager' | 'seer' | 'guard' | 'witch' | 'hunter';
/**
 * 6 vai mở rộng (rules §11): Già làng, Người hoá sói, Tay sai, Kẻ chán đời,
 * Cupid, Sói con. Mặc định tắt, chủ phòng bật từng vai, mỗi vai tối đa 1 người.
 */
export type ExtraRole = 'elder' | 'lycan' | 'minion' | 'tanner' | 'cupid' | 'wolfcub';
export type WwRole = BaseRole | ExtraRole;

/**
 * Phe: Dân làng, Sói (Ma Sói, Sói con, Tay sai), Kẻ chán đời (phe riêng) và
 * Tình nhân (cặp đôi khác phe, rules §11.5: không vai nào vào ván đã ở phe này).
 */
export type WwTeam = 'wolves' | 'village' | 'tanner' | 'lovers';

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
export type DeathCause = 'wolf' | 'poison' | 'vote' | 'hunter' | 'left' | 'love';

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
  /**
   * Cặp đôi Cupid đã ghép (`state.lovers`, rules §11.5), theo thứ tự ghế.
   * Thiếu hoặc null = ván không có cặp đôi.
   */
  lovers?: [string, string] | null;
}

/** Số người bầy Sói được cắn trong một đêm: 2 ở đêm sau khi Sói con chết (rules §11.7). */
export type WolfBites = 1 | 2;

/** Lựa chọn Đêm ① của một người (`gameData.nightPick`). */
export interface NightPick {
  round: number;
  targetId: string | null;
  confirmed: boolean;
  /**
   * Đêm cắn 2 (rules §11.7): tập người Sói này chọn cắn (0–2 người, khác
   * nhau). Thiếu thì dùng `targetId` như đêm thường. Đêm cắn 1 bỏ qua trường này.
   */
  biteIds?: string[] | null;
  /**
   * Cupid ở đêm 1 (rules §11.5): hai người được ghép đôi (đang chọn: 0–2
   * người). `targetId` của Cupid vẫn là "người mình nghi".
   */
  loverIds?: string[] | null;
}

/**
 * Lựa chọn Đêm ② (`gameData.witchPick`). Với Phù thủy: `heal` (cứu người bị
 * nhắm) và `poisonId`. Với người khác: `guessId` (đoán Sói nhắm ai).
 *
 * Đêm có 2 người bị nhắm (rules §11.7), Phù thủy chọn cứu ai bằng `healId`.
 * `healId` có giá trị thì được dùng thay cho `heal`; `heal: true` không kèm
 * `healId` chỉ hợp lệ khi có đúng một người bị nhắm.
 */
export interface WitchPick {
  round: number;
  heal: boolean;
  poisonId: string | null;
  guessId: string | null;
  confirmed: boolean;
  healId?: string | null;
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

export type WinReason =
  | 'no-wolves'
  | 'wolf-parity'
  | 'tanner-hanged' // Kẻ chán đời bị treo (rules §11.6)
  | 'lovers'; // chỉ còn cặp Tình nhân (rules §11.5)

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
  // Đêm cắn 2 có thêm `targetIds` (mọi người bị nhắm, theo ghế); đêm thường không có.
  | { kind: 'wolves'; round: number; targetId: string | null; how: WolfTallyHow; targetIds?: string[] }
  | { kind: 'guard'; round: number; guardId: string; targetId: string }
  | { kind: 'seer'; round: number; seerId: string; targetId: string; isWolf: boolean }
  | { kind: 'witch'; round: number; witchId: string; healedId: string | null; poisonId: string | null }
  | { kind: 'death'; round: number; id: string; cause: DeathCause }
  | { kind: 'suspects'; round: number; picks: Record<string, string> }
  | { kind: 'guesses'; round: number; picks: Record<string, string> }
  | { kind: 'vote'; round: number; ballots: Record<string, DayBallot>; executedId: string | null }
  | { kind: 'hunter'; round: number; hunterId: string; targetId: string | null }
  | { kind: 'left'; round: number; id: string; during: WwPhase }
  // Vai mở rộng (rules §11):
  | { kind: 'lovers'; round: number; cupidId: string; loverIds: [string, string]; mixed: boolean }
  | { kind: 'elder'; round: number; elderId: string }
  | { kind: 'love'; round: number; id: string; loverId: string; part: 'night' | 'day' };
