// Đồ nghề cho engine/*.test.ts (không phải file test, `node --test` không chạy nó).

import { DEFAULT_RULES } from './types.ts';
import type { NightPick, Rng, WitchPick, WwDeath, WwRole, WwRules, WwTable } from './types.ts';

/** Bàn chơi từ `{ id: vai }`: thứ tự khoá là thứ tự ghế. */
export function makeTable(roles: Record<string, WwRole>, deaths: WwDeath[] = []): WwTable {
  return { seatOrder: Object.keys(roles), roles: { ...roles }, deaths };
}

/** Bàn 7 người hay dùng: 2 Sói, Tiên tri, Bảo vệ, Phù thủy, Thợ săn, 1 Dân. */
export function table7(deaths: WwDeath[] = []): WwTable {
  return makeTable(
    { w1: 'werewolf', seer: 'seer', v1: 'villager', guard: 'guard', w2: 'werewolf', witch: 'witch', hunter: 'hunter' },
    deaths,
  );
}

/**
 * Bàn 12 người có đủ 6 vai mở rộng (rules §11): Ma Sói, Sói con, Tay sai, Tiên
 * tri, Bảo vệ, Phù thủy, Thợ săn, Già làng, Người hoá sói, Kẻ chán đời, Cupid, 1 Dân.
 */
export function table12(deaths: WwDeath[] = []): WwTable {
  return makeTable(
    {
      w1: 'werewolf',
      seer: 'seer',
      elder: 'elder',
      cub: 'wolfcub',
      guard: 'guard',
      lycan: 'lycan',
      witch: 'witch',
      minion: 'minion',
      hunter: 'hunter',
      tanner: 'tanner',
      cupid: 'cupid',
      v1: 'villager',
    },
    deaths,
  );
}

/** Bàn có cặp đôi `a`, `b` (như `state.lovers`). */
export function withLovers(table: WwTable, a: string, b: string): WwTable {
  return { ...table, lovers: [a, b] };
}

export function rules(over: Partial<WwRules> = {}): WwRules {
  return { ...DEFAULT_RULES, ...over };
}

export function night(round: number, targetId: string | null, confirmed = true): NightPick {
  return { round, targetId, confirmed };
}

/** Lựa chọn của một Sói ở đêm cắn 2: tập `biteIds` (ô lưới `targetId` là người đầu). */
export function bite(round: number, biteIds: string[], confirmed = true): NightPick {
  return { round, targetId: biteIds[0] ?? null, confirmed, biteIds };
}

/** Lựa chọn của Cupid ở đêm 1: cặp `loverIds`, cùng "người mình nghi" `targetId`. */
export function cupid(round: number, loverIds: string[], targetId: string | null = null, confirmed = true): NightPick {
  return { round, targetId, confirmed, loverIds };
}

export function witch(round: number, over: Partial<Omit<WitchPick, 'round'>> = {}): WitchPick {
  return { round, heal: false, poisonId: null, guessId: null, confirmed: true, ...over };
}

export function dead(id: string, round: number, cause: WwDeath['cause']): WwDeath {
  return { id, round, cause };
}

/** rng cố định (mulberry32), cùng seed thì cùng chuỗi số. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rng trả lần lượt các giá trị cho sẵn (lặp lại khi hết). */
export function fixedRng(...values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

/** rng mà test khẳng định không được gọi. */
export const noRng: Rng = () => {
  throw new Error('rng không được gọi ở ca này');
};
