// Which scene to show: a pure function of the shared game state, so every
// device shows the same one and a reload lands on the right scene.
import type { AvalonGameState } from '../types';
import { questNeedsTwoFails } from '../constants';
import { getJourney } from './journey';
import type { SceneResult } from './types';

const QUEST_PHASES: ReadonlySet<AvalonGameState['phase']> = new Set([
  'team-build',
  'team-vote',
  'team-vote-result',
  'quest-play',
  'quest-result',
]);

/**
 * @param state  `null` in the lobby (no game yet).
 * @param roomId seed fallback for the journey when the seat order is empty.
 * @param playerCount decides whether the 4th quest needs two fails (storm).
 */
export function getScene(
  state: AvalonGameState | null | undefined,
  roomId: string,
  playerCount: number
): SceneResult {
  const none = { storm: false, location: null } as const;
  if (!state) return { id: 'hall', ...none };

  const { phase } = state;
  if (phase === 'lineup-preview' || phase === 'role-reveal') return { id: 'hall', ...none };
  if (phase.startsWith('night-')) return { id: 'night', ...none };
  if (phase === 'lady-of-lake') return { id: 'lake', ...none };
  if (phase === 'assassinate') return { id: 'blood-moon', ...none };
  if (phase === 'end') {
    if (state.winner === 'good') return { id: 'end-good', ...none };
    if (state.winner === 'evil') return { id: 'end-evil', ...none };
    return { id: 'hall', ...none };
  }

  const questIdx = Math.min(Math.max(state.currentQuest, 0), 4);
  const location = getJourney(state, roomId)[questIdx];

  // currentQuest has already moved on: the camp is pitched before the next location.
  if (phase === 'discussion') return { id: 'camp', storm: false, location };

  if (QUEST_PHASES.has(phase)) {
    const storm = state.currentQuest === 3 && questNeedsTwoFails(playerCount, 3);
    return { id: location, storm, location };
  }
  return { id: 'hall', ...none };
}
