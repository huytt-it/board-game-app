// Phe và điều kiện thắng (rules §2, §11.1, §11.5, §11.8).

import { ROLE_TEAM } from './roles.ts';
import { aliveIds, isWolf, loversOf, roleOf } from './table.ts';
import type { WinReason, WinResult, WwTable, WwTeam } from './types.ts';

export const WIN_REASON_TEXT: Record<WinReason, string> = {
  'no-wolves': 'Không còn Ma Sói nào sống sót.',
  'wolf-parity': 'Số Sói còn sống đã bằng hoặc hơn số người còn lại.',
  'tanner-hanged': 'Kẻ chán đời bị treo — đúng điều họ muốn.',
  lovers: 'Chỉ còn lại cặp Tình nhân.',
};

/**
 * Cặp đôi khác phe (phe Sói / phe Dân / Kẻ chán đời) thành phe Tình nhân
 * (rules §11.5). Cặp cùng phe thì vẫn ở phe cũ, chỉ có thêm luật chết theo.
 */
export function isLoversTeam(table: WwTable): boolean {
  const pair = loversOf(table);
  if (!pair) return false;
  const [a, b] = pair.map((id) => roleOf(table, id));
  return a !== null && b !== null && ROLE_TEAM[a] !== ROLE_TEAM[b];
}

/** Phe của `id` lúc này: phe của vai, hoặc 'lovers' nếu ở trong cặp Tình nhân. Null nếu không có vai. */
export function teamOf(table: WwTable, id: string): WwTeam | null {
  const role = roleOf(table, id);
  if (role === null) return null;
  if (isLoversTeam(table) && loversOf(table)?.includes(id)) return 'lovers';
  return ROLE_TEAM[role];
}

/** `id` thắng ván có kết quả `result` không ("Phe bạn thắng / thua"): cùng phe với phe thắng. */
export function wonGame(table: WwTable, id: string, result: WinResult): boolean {
  return teamOf(table, id) === result.winner;
}

/**
 * Kiểm tra thắng sau mỗi lượt có người chết, theo thứ tự rules §11.8
 * (không có vai mở rộng thì chỉ còn bước 3–4, đúng rules §2):
 * 1. `hangedId` (người vừa bị treo) là Kẻ chán đời không ở phe Tình nhân: Kẻ chán đời thắng (E37, E38);
 * 2. còn đúng 2 người sống và đó là cặp Tình nhân: Tình nhân thắng (E47);
 * 3. không còn Sói (Ma Sói, Sói con, kể cả Sói trong cặp Tình nhân): Dân thắng, kể cả khi không còn ai sống (E27, E35);
 * 4. số Sói sống không ở phe Tình nhân ≥ số người sống còn lại: phe Sói thắng (E36, E48);
 * 5. không thì ván tiếp tục.
 */
export function checkWinner(table: WwTable, hangedId: string | null = null): WinResult | null {
  if (hangedId && roleOf(table, hangedId) === 'tanner' && teamOf(table, hangedId) === 'tanner') {
    return { winner: 'tanner', reason: 'tanner-hanged' };
  }
  const alive = aliveIds(table);
  const pair = loversOf(table);
  if (pair && isLoversTeam(table) && alive.length === 2 && pair.every((id) => alive.includes(id))) {
    return { winner: 'lovers', reason: 'lovers' };
  }
  const wolves = alive.filter((id) => isWolf(table, id));
  if (wolves.length === 0) return { winner: 'village', reason: 'no-wolves' };
  const counted = wolves.filter((id) => teamOf(table, id) !== 'lovers').length;
  if (counted >= alive.length - counted) return { winner: 'wolves', reason: 'wolf-parity' };
  return null;
}
