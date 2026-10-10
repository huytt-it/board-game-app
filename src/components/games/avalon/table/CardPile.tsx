'use client';

import type { CSSProperties } from 'react';
import type { Player } from '@/types/player';
import type { AvalonGameData, AvalonGameState } from '../types';
import { seatPosition } from './seatPosition';
import { questResultTimeline } from './timelines';
import { useArrivals } from '../hooks/useArrivals';
import { useCue } from '../hooks/useCue';
import { hashString } from '../scenes/journey';
import { CardBack } from '../ui/QuestCard';

// Where the face-down pile sits, in % of the table container: on the table
// surface below the reject candles — the one spot that stays clear of every
// seat's avatar and name label for 5–10 players (above the quest row it would
// touch the top seat's name at 375px).
const PILE = { x: 50, y: 73 };

// Small fixed tilt / offset per card so the pile looks dropped, not stacked by
// a machine. Derived from the player id, so a card keeps its place when
// another one lands.
function jitter(id: string) {
  const h = hashString(id);
  return { dx: ((h % 9) - 4) * 1.2, dy: (((h >>> 4) % 5) - 2) * 0.8, rot: ((h >>> 8) % 21) - 10 };
}

/** Team members whose card is in (each player's own questCard is the truth). */
export function playedIds(state: AvalonGameState, players: Player[]): string[] {
  return state.proposedTeam.filter((id) => {
    const card = (players.find((p) => p.id === id)?.gameData as Partial<AvalonGameData> | undefined)?.questCard;
    return card === 'success' || card === 'fail';
  });
}

// The quest's face-down pile at the centre of the round table (quest-play and
// quest-result). Every card looks the same (CardBack) — whoever played it and
// whatever it is. When a member plays, a card flies from their seat into the
// pile, on every screen. In quest-result the pile stays until the result is
// stamped (the panel turns the cards over), then fades as the quest's tile is
// sealed.
export default function CardPile({ players, state }: { players: Player[]; state: AvalonGameState }) {
  const n = players.length;
  const quest = state.quests[state.currentQuest];
  const teamSize = quest?.teamSize ?? state.proposedTeam.length;
  const resultPhase = state.phase === 'quest-result';

  const played = playedIds(state, players);
  // In the result every card is in: one that was never played counted as a
  // success, so fill the pile up to the team size.
  const ids = resultPhase
    ? [...played, ...Array.from({ length: Math.max(0, teamSize - played.length) }, (_, i) => `auto:${i}`)]
    : played;
  const arrivals = useArrivals(played);
  const cue = useCue(state.phaseStartedAt ?? 0);

  const fadeStyle = resultPhase ? { animationDelay: cue(questResultTimeline(teamSize).stampAt) } : undefined;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-10 ${resultPhase ? 'av-pile-out' : ''}`}
      style={fadeStyle}
      aria-hidden
      data-card-pile={ids.length}
    >
      {/* Empty slot + count, so it is clear where the cards go. */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${PILE.x}%`, top: `${PILE.y}%` }}>
        <div className="av-card aspect-[5/7] w-6 border-2 border-dashed border-(--av-gold)/40 sm:w-8 lg:w-10" />
        <span className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/75 px-1.5 py-0.5 text-[clamp(10px,3cqw,12px)] font-bold tabular-nums text-(--av-text)">
          {ids.length}/{teamSize}
        </span>
      </div>

      {ids.map((id) => {
        const j = jitter(id);
        const seat = id.startsWith('auto:') ? -1 : players.findIndex((p) => p.id === id);
        const from = seat >= 0 ? seatPosition(seat, n) : PILE;
        const flying = arrivals.has(id);
        // The card sits on the pile point; a new one flies in from its
        // player's seat (offset in % of the table = cqw, see `av-card-fly`).
        // Small elements only — a moved full-size layer would make the page
        // scroll sideways.
        const style = {
          left: `${PILE.x}%`,
          top: `${PILE.y}%`,
          '--dx': from.x - PILE.x,
          '--dy': from.y - PILE.y,
        } as CSSProperties;
        return (
          <div key={id} className={`absolute -translate-x-1/2 -translate-y-1/2 ${flying ? 'av-card-fly z-10' : ''}`} style={style}>
            <div style={{ transform: `translate(${j.dx}px, ${j.dy}px) rotate(${j.rot}deg)` }}>
              <CardBack className="w-6 sm:w-8 lg:w-10" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
