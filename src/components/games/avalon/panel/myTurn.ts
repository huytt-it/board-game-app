import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from '../types';

// "Đến lượt bạn": does the table wait for THIS player right now? A pure
// function of the shared state, so it says the same on every reload.
//
// Only the five moments where one player (or a few) must act and everybody
// can see it: the Leader picking the team, a vote not cast yet, a team member
// who has not played a card, the Lady, the Assassin. Who is the Leader, who has
// voted, who is on the team, who holds the Lady and who the Assassin is are all
// public by then — so the signal tells a neighbour nothing.
//
// NEVER at night or in the role reveal (ux-plan 2.4): there everybody has the
// same single button, and a signal that only some players get would show who
// the call is for. Every other phase answers `false`.
export function needsMyAction(state: AvalonGameState, me: Player): boolean {
  switch (state.phase) {
    case 'team-build':
      return state.currentLeaderId === me.id;
    case 'team-vote':
      return !state.teamVotes?.[me.id];
    case 'quest-play':
      return state.proposedTeam.includes(me.id) && !(me.gameData as Partial<AvalonGameData>).questCard;
    case 'lady-of-lake':
      return state.ladyHolderId === me.id;
    case 'assassinate':
      return (me.gameData as Partial<AvalonGameData>).role === AvalonRole.Assassin;
    default:
      return false;
  }
}
