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

export function rules(over: Partial<WwRules> = {}): WwRules {
  return { ...DEFAULT_RULES, ...over };
}

export function night(round: number, targetId: string | null, confirmed = true): NightPick {
  return { round, targetId, confirmed };
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
