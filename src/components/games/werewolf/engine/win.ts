// Điều kiện thắng (rules §2).

import { aliveIds, isWolf } from './table.ts';
import type { WinReason, WinResult, WwTable } from './types.ts';

export const WIN_REASON_TEXT: Record<WinReason, string> = {
  'no-wolves': 'Không còn Ma Sói nào sống sót.',
  'wolf-parity': 'Số Sói còn sống đã bằng hoặc hơn số người còn lại.',
};

/**
 * Dân thắng khi không còn Sói sống, kể cả khi không còn ai sống (E27). Sói
 * thắng khi số Sói sống ≥ số người sống không phải Sói. Không thì ván tiếp tục.
 */
export function checkWinner(table: WwTable): WinResult | null {
  const alive = aliveIds(table);
  const wolves = alive.filter((id) => isWolf(table, id)).length;
  if (wolves === 0) return { winner: 'village', reason: 'no-wolves' };
  if (wolves >= alive.length - wolves) return { winner: 'wolves', reason: 'wolf-parity' };
  return null;
}
