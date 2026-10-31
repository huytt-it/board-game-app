// Câu hỏi về bàn chơi mà mọi phần của engine đều cần: ai còn sống, ai là Sói,
// ai yêu ai. Sống/chết chỉ đọc từ `deaths` (plan §2.2), không dùng `Player.isAlive`.

import { isWolfRole } from './roles.ts';
import type { WwDeath, WwRole, WwTable } from './types.ts';

export function deadIds(table: WwTable): Set<string> {
  return new Set(table.deaths.map((d) => d.id));
}

export function isAlive(table: WwTable, id: string): boolean {
  return table.seatOrder.includes(id) && !table.deaths.some((d) => d.id === id);
}

/** Người còn sống, theo thứ tự ghế. */
export function aliveIds(table: WwTable): string[] {
  const dead = deadIds(table);
  return table.seatOrder.filter((id) => !dead.has(id));
}

export function roleOf(table: WwTable, id: string): WwRole | null {
  return table.roles[id] ?? null;
}

/** Là Sói (Ma Sói, Sói con — rules §11.1). Tay sai thuộc phe Sói nhưng không phải Sói. */
export function isWolf(table: WwTable, id: string): boolean {
  const role = roleOf(table, id);
  return role !== null && isWolfRole(role);
}

/** Mọi Sói của ván (kể cả đã chết), theo thứ tự ghế: Sói thấy đồng đội, Tay sai thấy bầy. */
export function wolfIds(table: WwTable): string[] {
  return table.seatOrder.filter((id) => isWolf(table, id));
}

/** Người còn sống giữ vai `role`, theo thứ tự ghế. */
export function aliveWithRole(table: WwTable, role: WwRole): string[] {
  return aliveIds(table).filter((id) => table.roles[id] === role);
}

/** Ván có vai này không (kể cả khi người giữ vai đã chết). */
export function hasRole(table: WwTable, role: WwRole): boolean {
  return table.seatOrder.some((id) => table.roles[id] === role);
}

/** Bàn sau khi thêm `newDeaths` (không đổi bàn gốc). */
export function withDeaths(table: WwTable, newDeaths: readonly WwDeath[]): WwTable {
  return newDeaths.length === 0 ? table : { ...table, deaths: [...table.deaths, ...newDeaths] };
}

/** Sắp `ids` theo thứ tự ghế, bỏ trùng và bỏ id không có ghế. */
export function inSeatOrder(table: WwTable, ids: Iterable<string>): string[] {
  const set = new Set(ids);
  return table.seatOrder.filter((id) => set.has(id));
}

// ── Cặp đôi (rules §11.5) ────────────────────────────────────────────────

/** Cặp đôi của ván (hai người khác nhau, đều có ghế), hoặc null. */
export function loversOf(table: WwTable): [string, string] | null {
  const pair = table.lovers;
  if (!pair || pair.length !== 2) return null;
  const [a, b] = pair;
  if (a === b || !table.seatOrder.includes(a) || !table.seatOrder.includes(b)) return null;
  return [a, b];
}

/** Người yêu của `id`, hoặc null. */
export function loverOf(table: WwTable, id: string): string | null {
  const pair = loversOf(table);
  if (!pair) return null;
  if (pair[0] === id) return pair[1];
  if (pair[1] === id) return pair[0];
  return null;
}

/**
 * Chết theo người yêu (rules §11.5): người còn sống có người yêu nằm trong
 * `deaths` (những người vừa chết trong cùng một lượt) thì chết theo ngay,
 * nguyên nhân "love". Không ai che hay cứu được. Trả về các cái chết thêm
 * (0 hoặc 1 người), không đổi bàn gốc.
 */
export function loveDeaths(table: WwTable, deaths: readonly WwDeath[], round: number): WwDeath[] {
  const pair = loversOf(table);
  if (!pair) return [];
  const dying = new Set(deaths.map((d) => d.id));
  return pair
    .filter((id) => !dying.has(id) && dying.has(loverOf(table, id) as string) && isAlive(table, id))
    .map((id) => ({ id, round, cause: 'love' as const }));
}

/**
 * Chết vì rời làng, hoặc chết theo người yêu vừa bị cho rời làng. Cái chết
 * này không kích hoạt gì: Thợ săn không bắn, Sói con không làm bầy cắn 2
 * (rules §7, §11.5, §11.7).
 */
export function countsAsLeft(table: WwTable, id: string): boolean {
  const own = table.deaths.find((d) => d.id === id);
  if (own?.cause === 'left') return true;
  if (own?.cause !== 'love') return false;
  const partner = loverOf(table, id);
  return partner !== null && table.deaths.some((d) => d.id === partner && d.cause === 'left');
}
