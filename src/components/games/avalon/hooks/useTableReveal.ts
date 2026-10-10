'use client';

import type { AvalonGameState } from '../types';
import { usePhaseTimeline, type TimelineStage } from './usePhaseTimeline';
import { CANDLE_STAGES, IDLE_STAGES, questSealStages } from '../table/timelines';

// What the round table, the roster and the reject chip may show while the
// result screens play their sequence: they must not give the result away
// before the panel does. Pure functions of the state and the phase clock
// (usePhaseTimeline), so every device flips at the same moment; with reduced
// motion the final stage comes at once. Each hook only watches the ONE moment
// it needs, so a stage change re-renders just its caller.

/** The reject count to SHOW: a rejected team's candle only goes out 3.5 s into
 *  its result (the state already holds the new count). */
export function useShownRejectStreak(state: AvalonGameState): { rejectStreak: number; candleOut: boolean } {
  const rejected = state.phase === 'team-vote-result' && state.lastTeamVoteResult === 'rejected';
  const stages = (rejected ? CANDLE_STAGES : IDLE_STAGES) as readonly TimelineStage<string>[];
  const { stage } = usePhaseTimeline(state.phaseStartedAt ?? 0, stages);
  const lit = rejected && stage === 'lit';
  return {
    rejectStreak: lit ? Math.max(0, state.voteRejectStreak - 1) : state.voteRejectStreak,
    candleOut: rejected && !lit,
  };
}

/** A quest whose result is in the state but not revealed yet (quest-result,
 *  before the stamp): its tile and roster marks still look unplayed. */
export function useHiddenQuest(state: AvalonGameState): number | null {
  const questResult = state.phase === 'quest-result';
  const teamSize = state.quests[state.currentQuest]?.teamSize ?? 0;
  const stages = (questResult ? questSealStages(teamSize) : IDLE_STAGES) as readonly TimelineStage<string>[];
  const { stage } = usePhaseTimeline(state.phaseStartedAt ?? 0, stages);
  return questResult && stage === 'hidden' ? state.currentQuest : null;
}
