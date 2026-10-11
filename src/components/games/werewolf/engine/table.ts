// Câu hỏi về bàn chơi mà mọi phần của engine đều cần: ai còn sống, ai là Sói.
// Sống/chết chỉ đọc từ `deaths` (plan §2.2), không dùng `Player.isAlive`.

import { ROLE_TEAM } from './roles.ts';
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

export function isWolf(table: WwTable, id: string): boolean {
  const role = roleOf(table, id);
  return role !== null && ROLE_TEAM[role] === 'wolves';
}

/** Mọi Sói của ván (kể cả đã chết), theo thứ tự ghế: Sói thấy đồng đội. */
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
