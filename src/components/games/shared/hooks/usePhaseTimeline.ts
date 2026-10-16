'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { useReducedMotion } from './useReducedMotion';

export interface TimelineStage<S extends string> {
  id: S;
  /** Milliseconds after `startedAt` at which this stage begins. */
  at: number;
}

// Maps "time since the phase started" onto a list of named animation stages.
//
// The stage is a pure function of `startedAt` (state.phaseStartedAt) and the
// shared server clock, never of when the component mounted. So every device
// shows the same frame, a reload jumps straight to the right stage, and an
// animation that already finished is not replayed.
//
// `stages` must be non-empty, sorted by `at`, and referentially stable (declare
// it as a module-level constant). Only ONE timeout is pending at a time, aimed
// at the next stage boundary. With reduced motion the last stage is returned at
// once.
export function usePhaseTimeline<S extends string>(
  startedAt: number,
  stages: readonly TimelineStage<S>[]
): { stage: S; elapsed: number } {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  const elapsed = serverNow() - startedAt;
  let index = 0;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].at <= elapsed) index = i;
  }
  if (reduced) index = stages.length - 1;

  useEffect(() => {
    if (reduced) return;
    const next = stages[index + 1];
    if (!next) return;
    const delay = next.at - (serverNow() - startedAt);
    const t = setTimeout(() => setTick((n) => n + 1), Math.max(0, delay));
    return () => clearTimeout(t);
    // `tick` makes the effect re-arm after every wake-up, even if a timer fired
    // marginally early and the stage did not change yet.
  }, [startedAt, stages, index, tick, reduced]);

  return { stage: stages[index].id, elapsed };
}
