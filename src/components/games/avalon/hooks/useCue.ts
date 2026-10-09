'use client';

import { useState } from 'react';
import { serverNow } from '@/lib/serverClock';

// `animation-delay` values that line CSS animations up with the phase clock.
//
// `cue(at)` makes an animation look as if it started `at` ms after `startedAt`
// (state.phaseStartedAt) on the shared server clock: positive while that moment
// is still ahead, negative once it has passed — so a device that reloads, or
// whose state arrived late, jumps into the middle of the animation (or past its
// end) instead of replaying it, and every device shows the same frame.
//
// The base is taken ONCE, when the calling component mounts (and again if
// `startedAt` changes). It must not move on later renders: a CSS animation's
// delay counts from when the animation was applied, so only elements mounted
// together with the caller may use it. An element that mounts later (at a
// stage boundary) needs its own component calling useCue.
//
// Animations cued this way keep their END state as the element's static style
// and animate only `from` it, so with reduced motion (avalon.css turns every
// animation off) the element simply shows its final state.
export function useCue(startedAt: number): (at: number) => string {
  const [base, setBase] = useState(() => ({ startedAt, elapsed: serverNow() - startedAt }));
  if (base.startedAt !== startedAt) {
    // Adjusting state while rendering: a new phase start (same component).
    setBase({ startedAt, elapsed: serverNow() - startedAt });
  }
  return (at: number) => `${Math.round(at - base.elapsed)}ms`;
}
