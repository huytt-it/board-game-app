'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameState } from '../types';
import { SEAT_RADIUS_PCT, seatPosition } from './seatPosition';
import { useArrivals } from '../hooks/useArrivals';
import { useCue } from '../hooks/useCue';
import { LINEUP } from './timelines';
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
//
// `spin` (lineup-preview): the token first circles the table from `from`
// degrees, slowing down, and lands on `angle` — both turning nodes play the
// same animation (avalon.css `av-crown-spin`), so the badge stays upright.
function OrbitToken({
  angle,
  spin,
  children,
}: {
  angle: number;
  spin?: { from: number; delay: string };
  children: ReactNode;
}) {
  const spinVars = spin ? ({ '--spin-from': `${spin.from}deg`, animationDelay: spin.delay } as CSSProperties) : undefined;
  return (
    <div
      className={`av-orbit absolute left-1/2 top-1/2 h-0 w-0 ${spin ? 'av-crown-spin' : ''}`}
      style={{ transform: `rotate(${angle}deg)`, ...spinVars }}
    >
      <div className="absolute h-0 w-0" style={{ transform: `translateY(-${SEAT_RADIUS_PCT}cqw)` }}>
        <div
          className={`av-orbit absolute h-0 w-0 ${spin ? 'av-crown-spin-back' : ''}`}
          style={{ transform: `rotate(${-angle}deg)`, ...spinVars }}
        >
          <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${TABLE_AVATAR_BOX}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// A token that sits on a seat and, when it has just ARRIVED, flies in from
// another seat (offsets in % of the table = cqw, avalon.css `av-token-hand`).
function FlyingToken({
  to,
  from,
  flying,
  children,
}: {
  to: { x: number; y: number };
  from: { x: number; y: number } | null;
  flying: boolean;
  children: ReactNode;
}) {
  const start = from ?? to;
  const style = {
    left: `${to.x}%`,
    top: `${to.y}%`,
    '--dx': start.x - to.x,
    '--dy': start.y - to.y,
  } as CSSProperties;
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${TABLE_AVATAR_BOX} ${flying ? 'av-token-hand' : ''}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default function TableTokens({ players, state }: { players: Player[]; state: AvalonGameState }) {
  const n = players.length;
  const seatOf = (id: string | null) => (id ? players.findIndex((p) => p.id === id) : -1);
  const leaderIdx = seatOf(state.currentLeaderId);
  const crown = useOrbit(leaderIdx, n, true);
  const lady = useOrbit(seatOf(state.ladyHolderId), n, false);
  // lineup-preview: the crown is "spun" round the table and lands on the first
  // Leader, then the Lady is set down (table/timelines.ts LINEUP). On the
  // phase clock, so a reload lands on the right frame.
  const lineup = state.phase === 'lineup-preview';
  const cue = useCue(state.phaseStartedAt ?? 0);

  const team = state.proposedTeam.filter((id) => seatOf(id) >= 0);
  const nominated = useArrivals(team);
  const from = leaderIdx >= 0 ? seatPosition(leaderIdx, n) : null;

  // lady-of-lake: the Lady's gaze (a dark disc with her mark) flies from the
  // holder to whoever she is aiming at, and again whenever she changes her
  // mind. The real token stays on the holder until "Hoàn tất", when it takes
  // its own way round to the new seat (above). A re-aim on another screen is
  // an arrival like any other; a reload just shows the gaze where it rests.
  const aimIdx = state.phase === 'lady-of-lake' ? seatOf(state.ladyTargetId) : -1;
  const aimedId = aimIdx >= 0 ? (state.ladyTargetId as string) : null;
  const aiming = useArrivals(aimedId ? [aimedId] : []);
  const ladyFrom = seatOf(state.ladyHolderId) >= 0 ? seatPosition(seatOf(state.ladyHolderId), n) : null;

  return (
    // `overflow: clip` (+ a 12px margin, room for the badges at the table's
    // edge): the crown and the Lady ride a chain of rotations, and the browser
    // grows the page's scrollable area by the bounding boxes of that chain
    // — at 320px with 10 players and a token on a far-right seat that made
    // the phone scroll sideways (+3px) although nothing is drawn out there.
    <div className="pointer-events-none absolute inset-0 z-10 overflow-clip [overflow-clip-margin:12px]" aria-hidden>
      {crown !== null && (
        <OrbitToken
          angle={crown}
          spin={lineup ? { from: -LINEUP.spinTurns * 360, delay: cue(LINEUP.spinAt) } : undefined}
        >
          <span
            data-token="leader"
            className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-amber-100 bg-(--av-leader) text-[12px] text-(--av-ink) shadow shadow-black/40 ${lineup ? 'av-appear' : ''}`}
            style={lineup ? { animationDelay: cue(LINEUP.spinAt) } : undefined}
          >
            <AvIcon name="leader" />
          </span>
        </OrbitToken>
      )}

      {lady !== null && (
        <OrbitToken angle={lady}>
          <span
            data-token="lady"
            className={`absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-teal-100 bg-(--av-lady) text-[12px] text-(--av-ink) shadow shadow-black/40 ${lineup ? 'av-token-drop' : ''}`}
            style={lineup ? { animationDelay: cue(LINEUP.ladyAt) } : undefined}
          >
            <AvIcon name="lady" />
          </span>
        </OrbitToken>
      )}

      {aimedId && (
        <FlyingToken key={aimedId} to={seatPosition(aimIdx, n)} from={ladyFrom} flying={aiming.has(aimedId)}>
          <span
            data-token="lady-aim"
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border-2 border-(--av-lady) bg-(--av-ink) text-[12px] text-(--av-lady) shadow shadow-black/50"
          >
            <AvIcon name="lady" />
          </span>
        </FlyingToken>
      )}

      {/* A new nomination flies in from the Leader's seat. */}
      {team.map((id) => (
        <FlyingToken key={id} to={seatPosition(seatOf(id), n)} from={from} flying={nominated.has(id)}>
          <span
            data-token="team"
            className="absolute -top-3 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-orange-100 bg-(--av-team) text-[11px] text-(--av-ink) shadow shadow-black/50"
          >
            <AvIcon name="team" />
          </span>
        </FlyingToken>
      ))}
    </div>
  );
}
