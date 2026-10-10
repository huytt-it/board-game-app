'use client';

import { useMemo, type CSSProperties } from 'react';
import type { AvalonTeam } from '../types';
import { useCue } from '../hooks/useCue';
import { mulberry32 } from '../scenes/journey';
import { END } from '../table/timelines';

// The winners' burst at the end, for 3 s from the reveal moment: gold glints
// that flare and drift down when Good wins, embers that rise from the bottom
// of the screen when Evil wins. ≤ 30 particles, transform + opacity only.
//
// Positions come from the phase start (seeded), timing from the phase clock
// (useCue), so every screen shows the same burst; the caller mounts it only
// during the burst (EndSection), and its static style is invisible (opacity 0
// = the end of every particle), so reduced motion shows nothing.
const COUNT: Record<AvalonTeam, number> = { good: 26, evil: 24 };
// The palette of GĐ7: gold glints (--av-gold and lighter), embers in the
// Evil red (--av-evil, --av-evil-light) with the fire of the end scene.
const COLORS: Record<AvalonTeam, readonly string[]> = {
  good: ['#d4a64a', '#efe3c8', '#e6c27a', '#f2d9a0'],
  evil: ['#e05555', '#f2a7a7', '#e0663a', '#c44a3a'],
};

export default function EndSparks({ winner, startedAt, at }: { winner: AvalonTeam; startedAt: number; at: number }) {
  const cue = useCue(startedAt);
  const items = useMemo(() => {
    const rand = mulberry32((startedAt % 4294967296) ^ (winner === 'good' ? 0x5eed : 0xe1b3));
    const between = (a: number, b: number) => a + rand() * (b - a);
    const colors = COLORS[winner];
    return Array.from({ length: COUNT[winner] }, (_, i) => {
      const dur = winner === 'good' ? between(1200, 2000) : between(1500, 2300);
      // Each particle is over by END.sparksMs.
      const delay = between(0, END.sparksMs - dur - 100);
      const size = winner === 'good' ? between(3, 6) : between(2.5, 4.5);
      const style = {
        left: `${between(4, 96).toFixed(1)}%`,
        top: winner === 'good' ? `${between(8, 70).toFixed(1)}%` : `${between(80, 102).toFixed(1)}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        color: colors[i % colors.length],
        animationDuration: `${Math.round(dur)}ms`,
        '--dx': `${Math.round(between(-40, 40))}px`,
        '--dy': winner === 'good' ? `${Math.round(between(30, 90))}px` : `${Math.round(between(-55, -30))}vh`,
      } as CSSProperties;
      return { style, delay: Math.round(delay) };
    });
  }, [startedAt, winner]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[15] overflow-hidden" aria-hidden data-end-sparks={winner}>
      {items.map((p, i) => (
        <span
          key={i}
          className={winner === 'good' ? 'av-spark av-spark-glint' : 'av-spark av-spark-ember'}
          style={{ ...p.style, animationDelay: cue(at + p.delay) }}
        />
      ))}
    </div>
  );
}
