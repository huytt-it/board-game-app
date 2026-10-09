'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { SEAT_RADIUS_PCT, seatPosition } from './seatPosition';
import { useArrivals } from '../hooks/useArrivals';
import AvIcon from '../assets/AvIcon';
import { TABLE_AVATAR_BOX } from '../ui/PlayerAvatar';

// The tokens that sit on the seats of the round table — the Leader's crown,
// the Lady of the Lake and the "nominated" token of each player the Leader
// puts on the team — drawn as one overlay over RoundTable, on boxes the size
// of a seat's avatar centred on the same seat points (seatPosition).
//
// They MOVE instead of popping: when the Leader changes, the crown travels
// clockwise around the table to the new seat; when the Lady passes on, her
// token takes the short way round; when the Leader nominates someone, a token
// flies from the Leader's seat to theirs. Only `transform` animates.
//
// Distances use `cqw` (RoundTable is a square size container, so 1cqw = 1 % of
// the table both ways) on zero-size anchors. Never move or turn a layer the
// size of the table: its transformed box would stick out of the page and make
// the phone screen scroll sideways.
//
// Decorative transitions from the previous value (ux-plan 2.2): a reload or a
// late mount simply shows the tokens where they are now.

// Angle of a token travelling around the table to `index`. Kept cumulative so
// the CSS transition always goes the intended way round (and the crown never
// spins backwards from the last seat to the first).
function useOrbit(index: number, n: number, clockwise: boolean): number | null {
  const target = index < 0 || n === 0 ? null : (360 / n) * index;
  const [orbit, setOrbit] = useState<{ target: number | null; angle: number | null }>({ target, angle: target });
  if (orbit.target !== target) {
    // Adjusting state while rendering: the token's seat changed.
    let angle = target;
    if (target !== null && orbit.angle !== null) {
      const from = ((orbit.angle % 360) + 360) % 360;
      const d = target - from;
      angle = orbit.angle + (clockwise ? ((d % 360) + 360) % 360 : ((d + 540) % 360) - 180);
    }
    setOrbit({ target, angle });
  }
  return orbit.angle;
}

// A token riding the table's rim: an anchor at the table centre turns, an arm
// reaches out to the rim (seat 0 is at 12 o'clock), and the seat box turns
// back by the same angle, so the badge stays upright at its corner of the
// avatar all the way round.
function OrbitToken({ angle, children }: { angle: number; children: ReactNode }) {
  return (
    <div className="av-orbit absolute left-1/2 top-1/2 h-0 w-0" style={{ transform: `rotate(${angle}deg)` }}>
      <div className="absolute h-0 w-0" style={{ transform: `translateY(-${SEAT_RADIUS_PCT}cqw)` }}>
        <div className="av-orbit absolute h-0 w-0" style={{ transform: `rotate(${-angle}deg)` }}>
          <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${TABLE_AVATAR_BOX}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function TableTokens({ players, state }: { players: Player[]; state: AvalonGameState }) {
  const n = players.length;
  const seatOf = (id: string | null) => (id ? players.findIndex((p) => p.id === id) : -1);
  const leaderIdx = seatOf(state.currentLeaderId);
  const crown = useOrbit(leaderIdx, n, true);
  const lady = useOrbit(seatOf(state.ladyHolderId), n, false);

  const team = state.proposedTeam.filter((id) => seatOf(id) >= 0);
  const nominated = useArrivals(team);
  const from = leaderIdx >= 0 ? seatPosition(leaderIdx, n) : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {crown !== null && (
        <OrbitToken angle={crown}>
          <span
            data-token="leader"
            className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-amber-100 bg-(--av-leader) text-[12px] text-(--av-ink) shadow shadow-black/40"
          >
            <AvIcon name="leader" />
          </span>
        </OrbitToken>
      )}

      {lady !== null && (
        <OrbitToken angle={lady}>
          <span
            data-token="lady"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-teal-100 bg-(--av-lady) text-[12px] text-(--av-ink) shadow shadow-black/40"
          >
            <AvIcon name="lady" />
          </span>
        </OrbitToken>
      )}

      {team.map((id) => {
        const to = seatPosition(seatOf(id), n);
        const start = from ?? to;
        const flying = nominated.has(id);
        // A new nomination flies in from the Leader's seat (offset in % of
        // the table, i.e. cqw — see avalon.css `av-token-hand`).
        const style = {
          left: `${to.x}%`,
          top: `${to.y}%`,
          '--dx': start.x - to.x,
          '--dy': start.y - to.y,
        } as CSSProperties;
        return (
          <div
            key={id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${TABLE_AVATAR_BOX} ${flying ? 'av-token-hand' : ''}`}
            style={style}
          >
            <span
              data-token="team"
              className="absolute -top-3 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-orange-100 bg-(--av-team) text-[11px] text-(--av-ink) shadow shadow-black/50"
            >
              <AvIcon name="team" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
