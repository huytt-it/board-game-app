import type { Rng } from './types.ts';

/** Fisher–Yates với `rng` truyền vào. Không đổi mảng gốc. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Một phần tử ngẫu nhiên của mảng khác rỗng. */
export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: mảng rỗng');
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}
