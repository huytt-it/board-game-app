// Vai, phe, điểm cân bằng, bộ vai mặc định và chia vai (rules §3, §4, §11).

import { shuffle } from './random.ts';
import type { BaseRole, RoleCounts, Rng, WwRole, WwTeam } from './types.ts';

/** Thứ tự hiển thị 6 vai gốc (như cột của bảng rules §4). */
export const ROLE_ORDER: readonly WwRole[] = ['werewolf', 'seer', 'guard', 'witch', 'hunter', 'villager'];

/** 6 vai mở rộng (rules §11), theo thứ tự bảng §11. Mặc định tắt. */
export const EXTRA_ROLES: readonly WwRole[] = ['elder', 'lycan', 'minion', 'tanner', 'cupid', 'wolfcub'];

/** Mọi vai: 6 vai gốc rồi 6 vai mở rộng. */
export const ALL_ROLES: readonly WwRole[] = [...ROLE_ORDER, ...EXTRA_ROLES];

/**
 * "Sói" (rules §11.1): cắn cùng bầy, được đếm khi xét "Sói đủ số", còn một
 * Sói sống thì làng chưa thắng. Tay sai thuộc phe Sói nhưng không phải Sói.
 */
export const WOLF_ROLES: readonly WwRole[] = ['werewolf', 'wolfcub'];

export function isWolfRole(role: WwRole): boolean {
  return WOLF_ROLES.includes(role);
}

/** Tiên tri soi ra "Là Sói": Ma Sói, Sói con và Người hoá sói (rules §11.3). */
export function seenAsWolf(role: WwRole): boolean {
  return isWolfRole(role) || role === 'lycan';
}

/** Phe lúc vào ván. Cặp đôi khác phe thành phe Tình nhân: xem `teamOf` (win.ts). */
export const ROLE_TEAM: Record<WwRole, WwTeam> = {
  werewolf: 'wolves',
  villager: 'village',
  seer: 'village',
  guard: 'village',
  witch: 'village',
  hunter: 'village',
  elder: 'village',
  lycan: 'village',
  minion: 'wolves',
  tanner: 'tanner',
  cupid: 'village',
  wolfcub: 'wolves',
};

export const ROLE_NAME: Record<WwRole, string> = {
  werewolf: 'Ma Sói',
  villager: 'Dân làng',
  seer: 'Tiên tri',
  guard: 'Bảo vệ',
  witch: 'Phù thủy',
  hunter: 'Thợ săn',
  elder: 'Già làng',
  lycan: 'Người hoá sói',
  minion: 'Tay sai',
  tanner: 'Kẻ chán đời',
  cupid: 'Cupid',
  wolfcub: 'Sói con',
};

export const TEAM_NAME: Record<WwTeam, string> = {
  wolves: 'Ma Sói',
  village: 'Dân làng',
  tanner: 'Kẻ chán đời',
  lovers: 'Tình nhân',
};

/** Một câu cho màn xem vai / "Luật chơi" (rules §3, §11). */
export const ROLE_BLURB: Record<WwRole, string> = {
  werewolf: 'Mỗi đêm cùng bầy chọn một người để cắn. Biết đồng đội từ đầu ván.',
  villager: 'Không có năng lực. Ban đêm chọn người mình nghi, ban ngày tìm ra Sói.',
  seer: 'Mỗi đêm soi một người, biết người đó có phải Sói không.',
  guard: 'Mỗi đêm che một người khỏi Sói cắn, được tự che, không che một người hai đêm liền.',
  witch: 'Có 1 bình cứu và 1 bình độc cho cả ván. Thấy người bị Sói nhắm mỗi đêm.',
  hunter: 'Khi chết thì bắn ngay một người. Chết vì độc thì không bắn, trừ khi chủ phòng cho phép.',
  elder: 'Có một mạng phụ: lần đầu bị Sói cắn trúng thì không chết. Ban đêm chọn người mình nghi.',
  lycan: 'Là Dân làng, nhưng Tiên tri soi ra "Là Sói". Ban đêm chọn người mình nghi.',
  minion: 'Phe Sói: biết ai là Sói, nhưng Sói không biết bạn. Không cắn, ban đêm chọn người mình nghi.',
  tanner: 'Phe riêng: thắng một mình nếu bị treo. Chết cách khác thì thua.',
  cupid: 'Đêm đầu ghép đôi hai người (được chọn mình). Một người chết thì người kia chết theo.',
  wolfcub: 'Cắn cùng bầy như Ma Sói. Sói con chết thì đêm sau bầy được cắn 2 người.',
};

/** Điểm cân bằng (rules §4, §11): gần 0 là cân, dương lợi cho Dân, âm lợi cho Sói. */
export const ROLE_POINTS: Record<WwRole, number> = {
  werewolf: -6,
  villager: 1,
  seer: 7,
  guard: 3,
  witch: 4,
  hunter: 3,
  elder: 3,
  lycan: -1,
  minion: -6,
  tanner: -2,
  cupid: -3,
  wolfcub: -8,
};

/** Vai đặc biệt gốc: mỗi ván tối đa 1 người. */
export const SPECIAL_ROLES: readonly WwRole[] = ['seer', 'guard', 'witch', 'hunter'];

/** Mọi vai tối đa 1 người (rules §4): 4 vai đặc biệt gốc và cả 6 vai mở rộng (E55). */
export const LIMITED_ROLES: readonly WwRole[] = [...SPECIAL_ROLES, ...EXTRA_ROLES];

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 12;

/** Bộ vai mặc định theo số người (bảng rules §4). Chỉ dùng 6 vai gốc. */
export const ROLE_PRESETS: Record<number, Record<BaseRole, number>> = {
  5: { werewolf: 1, seer: 1, guard: 1, witch: 0, hunter: 0, villager: 2 },
  6: { werewolf: 2, seer: 1, guard: 1, witch: 1, hunter: 0, villager: 1 },
  7: { werewolf: 2, seer: 1, guard: 1, witch: 1, hunter: 0, villager: 2 },
  8: { werewolf: 2, seer: 1, guard: 1, witch: 1, hunter: 0, villager: 3 },
  9: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 2 },
  10: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 3 },
  11: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 4 },
  12: { werewolf: 3, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 5 },
};

/** Bộ vai mặc định cho `playerCount` người (đủ 6 vai gốc, không có vai mở rộng), hoặc null nếu ngoài 5–12. */
export function presetFor(playerCount: number): (Record<BaseRole, number> & RoleCounts) | null {
  const preset = ROLE_PRESETS[playerCount];
  return preset ? { ...preset } : null;
}

/**
 * Đủ 12 vai, mỗi vai một số. Khoá lạ bị bỏ; giá trị không phải số thì tính 0
 * (validateSetup báo lỗi riêng cho số âm / số lẻ).
 */
export function fullCounts(counts: RoleCounts): Record<WwRole, number> {
  const out = {} as Record<WwRole, number>;
  for (const role of ALL_ROLES) {
    const n = counts[role];
    out[role] = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  }
  return out;
}

export function totalRoles(counts: RoleCounts): number {
  const full = fullCounts(counts);
  return ALL_ROLES.reduce((sum, role) => sum + full[role], 0);
}

/** Số Sói của bộ vai: Ma Sói + Sói con (rules §4, §11.1). */
export function wolfCount(counts: RoleCounts): number {
  const full = fullCounts(counts);
  return WOLF_ROLES.reduce((sum, role) => sum + full[role], 0);
}

export function balanceScore(counts: RoleCounts): number {
  const full = fullCounts(counts);
  return ALL_ROLES.reduce((sum, role) => sum + full[role] * ROLE_POINTS[role], 0);
}

/**
 * Điểm lệch quá mức này (nhỏ hơn −6 hoặc lớn hơn +6) thì sảnh cảnh báo, không
 * chặn bắt đầu ván. Bộ mặc định cao nhất là +6 nên không bao giờ bị cảnh báo
 * (rules §4, người dùng chốt 2026-10-11).
 */
export const BALANCE_WARN = 6;

/** Câu cảnh báo cho sảnh khi bộ vai lệch quá ±BALANCE_WARN, hoặc null. */
export function balanceWarning(counts: RoleCounts): string | null {
  const score = balanceScore(counts);
  if (score > BALANCE_WARN) return `Bộ vai lệch nhiều về phía Dân (điểm +${score}). Vẫn bắt đầu được.`;
  if (score < -BALANCE_WARN) return `Bộ vai lệch nhiều về phía Sói (điểm ${score}). Vẫn bắt đầu được.`;
  return null;
}

/** Điểm trong khoảng ±BALANCE_EVEN thì nhãn ở sảnh ghi "cân". */
export const BALANCE_EVEN = 2;

export type BalanceLean = 'village' | 'even' | 'wolves';

export const BALANCE_LEAN_TEXT: Record<BalanceLean, string> = {
  village: 'lợi Dân',
  even: 'cân',
  wolves: 'lợi Sói',
};

/** Nhãn "lợi Dân / cân / lợi Sói" luôn hiện cạnh điểm ở sảnh. */
export function balanceLean(score: number): BalanceLean {
  if (score > BALANCE_EVEN) return 'village';
  if (score < -BALANCE_EVEN) return 'wolves';
  return 'even';
}

export type SetupErrorCode = 'player-count' | 'bad-count' | 'total' | 'no-wolf' | 'too-many-wolves' | 'special-limit';

export interface SetupError {
  code: SetupErrorCode;
  /** Câu báo lỗi tiếng Việt cho màn sảnh. */
  message: string;
}

/**
 * Ràng buộc khi bắt đầu ván (rules §4, E28, E55). Mảng rỗng = được bắt đầu.
 * Sói = Ma Sói + Sói con. Điểm cân bằng chỉ để cảnh báo, không nằm ở đây.
 */
export function validateSetup(playerCount: number, counts: RoleCounts): SetupError[] {
  const errors: SetupError[] = [];
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    errors.push({
      code: 'player-count',
      message: `Cần từ ${MIN_PLAYERS} đến ${MAX_PLAYERS} người, đang có ${playerCount}.`,
    });
  }
  const bad = ALL_ROLES.filter((role) => {
    const n = counts[role];
    return n !== undefined && !(Number.isInteger(n) && n >= 0);
  });
  if (bad.length > 0) {
    errors.push({
      code: 'bad-count',
      message: `Số lượng vai không hợp lệ: ${bad.map((r) => ROLE_NAME[r]).join(', ')}.`,
    });
  }
  const full = fullCounts(counts);
  const total = totalRoles(counts);
  if (total !== playerCount) {
    errors.push({
      code: 'total',
      message: `Tổng số vai (${total}) phải bằng số người (${playerCount}).`,
    });
  }
  const wolves = wolfCount(counts);
  if (wolves < 1) {
    errors.push({ code: 'no-wolf', message: 'Cần ít nhất 1 Ma Sói (hoặc Sói con).' });
  } else if (2 * wolves >= playerCount) {
    errors.push({
      code: 'too-many-wolves',
      message: `Quá nhiều Sói: ${wolves} Sói với ${playerCount} người thì Sói thắng ngay từ đầu.`,
    });
  }
  const over = LIMITED_ROLES.filter((role) => full[role] > 1);
  if (over.length > 0) {
    errors.push({
      code: 'special-limit',
      message: `Mỗi vai đặc biệt chỉ được 1 người: ${over.map((r) => `${ROLE_NAME[r]} (${full[r]})`).join(', ')}.`,
    });
  }
  return errors;
}

/**
 * Chia vai ngẫu nhiên cho `seatIds`. Gọi sau validateSetup. Kết quả chỉ dùng
 * để ghi vào `players/<id>.gameData.role`, không lưu vào state theo ghế.
 */
export function dealRoles(seatIds: readonly string[], counts: RoleCounts, rng: Rng): Record<string, WwRole> {
  const full = fullCounts(counts);
  const bag: WwRole[] = [];
  for (const role of ALL_ROLES) {
    for (let i = 0; i < full[role]; i++) bag.push(role);
  }
  if (bag.length !== seatIds.length) {
    throw new Error(`dealRoles: ${bag.length} vai cho ${seatIds.length} ghế`);
  }
  const deck = shuffle(bag, rng);
  const out: Record<string, WwRole> = {};
  seatIds.forEach((id, i) => {
    out[id] = deck[i];
  });
  return out;
}

/**
 * Việc của mỗi vai khi chạm lưới ở Đêm ① (rules §3, §11): Sói con cắn như Ma
 * Sói; các vai mở rộng khác (kể cả Cupid) chọn "người mình nghi". Việc ghép
 * đôi của Cupid ở đêm 1 làm trong thẻ giữ, xem `cupidPairsTonight`.
 */
export type NightAction = 'wolf' | 'seer' | 'guard' | 'suspect';

export function nightActionOf(role: WwRole): NightAction {
  if (isWolfRole(role)) return 'wolf';
  if (role === 'seer') return 'seer';
  if (role === 'guard') return 'guard';
  return 'suspect';
}

/** Cupid ghép đôi ở Đêm ① của đêm 1, ngoài "người mình nghi" (rules §11.5). */
export function cupidPairsTonight(role: WwRole, round: number): boolean {
  return role === 'cupid' && round === 1;
}
