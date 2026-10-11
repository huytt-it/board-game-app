'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState, LadyEvent } from '../types';
import { LadyEventText, recentLadyEvent } from '../panel/ladyEvent';
import AvIcon from '../assets/AvIcon';

// "X đã soi Y" / "X hết giờ — …" for ~4 s, under the top bar, when the Lady's
// turn ends while this screen is open (GĐ8). Decorative (ux-plan 2.2): the
// previous phase is kept and compared on this client, so a reload announces
// nothing — the discussion panel's line (ladyLastEvent) is the lasting source.
// Public, the same words on every screen.
export default function LadyNotice({ state, players }: { state: AvalonGameState; players: Player[] }) {
  const event = state.phase === 'discussion' ? recentLadyEvent(state) : null;
  const [seen, setSeen] = useState(() => ({ phase: state.phase, show: null as LadyEvent | null }));
  if (seen.phase !== state.phase) {
    // Adjusting state while rendering: the phase changed on this screen.
    setSeen({ phase: state.phase, show: seen.phase === 'lady-of-lake' ? event : null });
  }
  useEffect(() => {
    if (!seen.show) return;
    const t = setTimeout(() => setSeen((s) => ({ ...s, show: null })), 4000);
    return () => clearTimeout(t);
  }, [seen.show]);

  if (!seen.show) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-12 z-30 flex justify-center px-4" role="status" aria-live="polite">
      <p
        className="av-toast flex max-w-md items-start gap-2 rounded-xl border border-(--av-line) bg-(--av-ink) px-4 py-2 text-sm text-(--av-text-2) shadow-lg shadow-black/50"
        data-lady-notice={seen.show.how}
      >
        <AvIcon name="lady" className="mt-0.5 shrink-0 text-(--av-lady)" />
        <span>
          <LadyEventText event={seen.show} players={players} />
        </span>
      </p>
    </div>
  );
}
