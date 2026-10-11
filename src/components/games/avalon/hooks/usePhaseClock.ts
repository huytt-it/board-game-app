'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { phaseTimeoutMs, type AvalonGameState, type AvalonPhase } from '../types';

export interface PhaseClock {
  /** Server time, refreshed every second. */
  now: number;
  /** Milliseconds since the current phase started. */
  elapsed: number;
  /** Milliseconds left until the phase times out (never negative). */
  remaining: number;
}

// Countdown for the current phase on the shared server clock (not the device
// clock), so every player sees the same number. Ticks once per second — just
// after each whole second of the phase clock, so every countdown on a screen
// (the panel's, the top bar's) and on every device turns over together. The
// duration is the one this game fixed when it started (phaseTimeoutMs).
export function usePhaseClock(
  state: AvalonGameState,
  timeoutMs: number = phaseTimeoutMs(state)
): PhaseClock {
  const startedAt = state.phaseStartedAt ?? 0;
  const [clock, setClock] = useState(() => ({ startedAt, now: serverNow() }));
  if (clock.startedAt !== startedAt) {
    // Adjusting state while rendering: the phase clock restarted (a new phase,
    // the Lady's new aim) — read the time again, or the last tick (up to 1 s
    // old) would show more time than the phase has.
    setClock({ startedAt, now: serverNow() });
  }
  const now = clock.now;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      const into = (((serverNow() - startedAt) % 1000) + 1000) % 1000;
      t = setTimeout(() => {
        setClock({ startedAt, now: serverNow() });
        arm();
      }, 1000 - into + 20);
    };
    arm();
    return () => clearTimeout(t);
  }, [startedAt]);

  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, timeoutMs - elapsed);
  return { now, elapsed, remaining };
}

/** `m:ss`, rounded down — e.g. 61_900 → "1:01". */
export function formatClock(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** `Ns`, rounded up — e.g. 29_100 → "30s". */
export function formatSecs(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

// ── "Time is running out" (GĐ8) ──────────────────────────────────────────
// The phases that show a clock. The two 8-second result reviews and the end
// have none: they are never "running out".
const CLOCKED = new Set<AvalonPhase>([
  'lineup-preview',
  'role-reveal',
  'night-evils',
  'night-merlin',
  'night-percival',
  'team-build',
  'team-vote',
  'quest-play',
  'discussion',
  'lady-of-lake',
  'assassinate',
]);

export function isClocked(phase: AvalonPhase): boolean {
  return CLOCKED.has(phase);
}

/** When a phase of `totalMs` counts as running out: the last max(10 s, 15 %)
 *  — vote 30 s → 10 s, quest 120 s → 18 s, discussion 10 min → 90 s. */
export function lowTimeMs(totalMs: number): number {
  return Math.max(10_000, Math.round(totalMs * 0.15));
}

/** Is the current phase's time running out, given `remaining` from usePhaseClock? */
export function isLowTime(state: AvalonGameState, remaining: number): boolean {
  return isClocked(state.phase) && remaining <= lowTimeMs(phaseTimeoutMs(state));
}

// The same answer for a component that has no clock of its own (the top bar,
// the dock): ONE timeout aimed at the moment the phase starts running out —
// no ticking. A pure function of the state and the server clock, so every
// screen flips together (night included).
export function useLowTime(state: AvalonGameState): boolean {
  const total = phaseTimeoutMs(state);
  const startedAt = state.phaseStartedAt ?? 0;
  const clocked = isClocked(state.phase);
  const at = startedAt + total - lowTimeMs(total);
  const [tick, wake] = useState(0);
  const low = clocked && serverNow() >= at;
  useEffect(() => {
    if (!clocked || low) return;
    const t = setTimeout(() => wake((n) => n + 1), Math.max(0, at - serverNow()) + 50);
    return () => clearTimeout(t);
    // `tick` re-arms the timeout if it woke a little early.
  }, [clocked, low, at, tick]);
  return low;
}

// The short phases count in seconds ("45s"), the others in minutes ("1:30").
const IN_SECONDS = new Set<AvalonPhase>(['team-build', 'team-vote', 'lady-of-lake']);

/** A phase's countdown, as its panel and the top bar's chip both show it.
 *  Rounded UP to whole seconds, so it reads 0 only when time is up. */
export function formatCountdown(phase: AvalonPhase, ms: number): string {
  return IN_SECONDS.has(phase) ? formatSecs(ms) : formatClock(Math.ceil(ms / 1000) * 1000);
}
