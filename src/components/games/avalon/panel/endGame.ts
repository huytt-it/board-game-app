// Why the game ended — read from the final state only (display logic; the
// rules that decided it live in useAvalon). Every way a game of Avalon can end:
//   Evil — three quests failed · five teams rejected in a row · the Assassin
//          found Merlin
//   Good — three quests succeeded and then the Assassin missed Merlin, or let
//          the clock run out without striking
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';
import { QUESTS_TO_WIN, VOTE_TRACK_LIMIT } from '../constants';

export type EndReason = 'quests-failed' | 'rejected' | 'merlin-found' | 'merlin-missed' | 'assassin-idle';

export function endReason(state: AvalonGameState, players: Player[]): EndReason {
  if (state.merlinTargetId) {
    const target = players.find((p) => p.id === state.merlinTargetId);
    const role = (target?.gameData as Partial<AvalonGameData> | undefined)?.role;
    return role === AvalonRole.Merlin ? 'merlin-found' : 'merlin-missed';
  }
  if (state.winner === 'good') return 'assassin-idle';
  if (state.voteRejectStreak >= VOTE_TRACK_LIMIT) return 'rejected';
  return 'quests-failed';
}

/** One line under the banner: how the winning side won. */
export function endReasonText(reason: EndReason, targetName?: string): string {
  switch (reason) {
    case 'quests-failed':
      return `${QUESTS_TO_WIN} Quest thất bại — Camelot thất thủ.`;
    case 'rejected':
      return `${VOTE_TRACK_LIMIT} lần liên tiếp đội bị bác — nến tắt hết.`;
    case 'merlin-found':
      return `Sát Thủ đâm trúng Merlin${targetName ? ` (${targetName})` : ''}.`;
    case 'merlin-missed':
      return `Sát Thủ đâm trật — ${targetName ?? 'người bị đâm'} không phải Merlin.`;
    case 'assassin-idle':
      return 'Đủ 3 Quest thành công — Sát Thủ hết giờ, không kịp ra tay.';
  }
}
