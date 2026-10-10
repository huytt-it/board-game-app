// Which scene to show: a pure function of the shared game state, so every
// device shows the same one and a reload lands on the right scene.
import type { AvalonGameState } from '../types';
import { questNeedsTwoFails } from '../constants';
import { getJourney } from './journey';
import type { SceneResult } from './types';

const GLOOM_PER_FAIL = 0.08;

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
  const none = { storm: false, location: null, gloom: 0 } as const;
  if (!state) return { id: 'hall', ...none };

  const { phase } = state;
  // The realm darkens a little with every failed quest (not at the end: the
  // dawn of a Good victory stays bright). The quest being revealed in
  // quest-result does not count yet: the scene must not darken before its
  // cards are turned over — it does when the next phase begins.
  const fails = (state.quests ?? []).filter(
    (q, i) => q?.result === 'fail' && !(phase === 'quest-result' && i === state.currentQuest)
  ).length;
  const gloom = Math.round(GLOOM_PER_FAIL * fails * 100) / 100;

  if (phase === 'lineup-preview' || phase === 'role-reveal') return { id: 'hall', ...none };
  if (phase.startsWith('night-')) return { id: 'night', ...none };
  if (phase === 'lady-of-lake') return { id: 'lake', ...none, gloom };
  if (phase === 'assassinate') return { id: 'blood-moon', ...none, gloom };
  if (phase === 'end') {
    if (state.winner === 'good') return { id: 'end-good', ...none };
    if (state.winner === 'evil') return { id: 'end-evil', ...none };
    return { id: 'hall', ...none };
  }

  const questIdx = Math.min(Math.max(state.currentQuest, 0), 4);
  const location = getJourney(state, roomId)[questIdx];

  // currentQuest has already moved on: the camp is pitched before the next location.
  if (phase === 'discussion') return { id: 'camp', storm: false, location, gloom };

  if (QUEST_PHASES.has(phase)) {
    const storm = state.currentQuest === 3 && questNeedsTwoFails(playerCount, 3);
    return { id: location, storm, location, gloom };
  }
  return { id: 'hall', ...none };
}
