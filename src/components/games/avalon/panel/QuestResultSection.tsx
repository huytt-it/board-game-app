import type { CSSProperties } from 'react';
import type { AvalonGameState } from '../types';
import { questNeedsTwoFails } from '../constants';
import { useCue } from '../hooks/useCue';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { questResultTimeline, questRevealOrder } from '../table/timelines';
import { TwoFailNote } from './shared';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import { CardBack, CardFace } from '../ui/QuestCard';

// quest-result (8 s): 0–0.8 s the face-down cards are shuffled and dealt into
// a row, then turned over one by one (0.6 s apart), and 0.4 s after the last
// one the SUCCESS / FAILED stamp lands — the quest's tile on the table seals at
// the same moment (RoundTable) — with the totals under it. The row is rebuilt
// from the COUNTS only (failCount) and shuffled with phaseStartedAt as the
// seed: nobody's card is ever shown as theirs (ux-plan 2.4). Public result, so
// the team colours are fine here — but they only appear as the cards turn.
export function QuestResultSection({
  state,
  playerCount,
}: {
  state: AvalonGameState;
  playerCount: number;
}) {
  const startedAt = state.phaseStartedAt ?? 0;
  const cue = useCue(startedAt);
  const quest = state.quests[state.currentQuest];
  const tl = questResultTimeline(quest?.teamSize ?? 1);
  const { stage } = usePhaseTimeline(startedAt, tl.stages);
  if (!quest) return null;

  const evilCount = quest.failCount;
  const goodCount = quest.teamSize - evilCount;
  const success = quest.result === 'success';
  const order = questRevealOrder(quest.teamSize, quest.failCount, startedAt);
  const n = order.length;
  const needsTwo = questNeedsTwoFails(playerCount, state.currentQuest);
  const tone = success ? 'border-(--av-good-light) text-(--av-good-light)' : 'border-(--av-evil-light) text-(--av-evil-light)';

  return (
    <div data-anim-stage={stage}>
      <GlassPanel className="relative overflow-hidden p-5 text-center">
        {/* The result's colour washes in with the stamp. */}
        <div
          className={`av-appear pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b to-transparent to-70% ${
            success ? 'from-(--av-good)/16' : 'from-(--av-evil)/16'
          }`}
          style={{ animationDelay: cue(tl.stampAt) }}
        />

        <div className="av-rise relative" style={{ animationDelay: cue(0) }}>
          <h3 className="av-display text-xl leading-tight text-(--av-text)">Lật bài</h3>
          {needsTwo && (
            <div className="flex justify-center">
              <TwoFailNote />
            </div>
          )}
        </div>

        {/* The row of cards: dealt from one pile, then turned over in order. */}
        <div className="relative mt-4 flex justify-center gap-2 [--card-gap:0.5rem] [--card-w:2.75rem] sm:[--card-w:3.5rem]" data-reveal-order={order.join(',')}>
          {order.map((side, i) => {
            const deal = {
              '--sx': `calc(${(n - 1) / 2 - i} * (var(--card-w) + var(--card-gap)))`,
              '--sy': `${-i * 2}px`,
              '--sr': `${(i % 2 ? 1 : -1) * (3 + i)}deg`,
              '--jx': `${i % 2 ? 16 : -16}px`,
              perspective: '600px',
              animationDelay: cue(0),
            } as CSSProperties;
            return (
              <div key={i} className="av-deal relative w-(--card-w)" style={deal}>
                <div className="av-flip" style={{ animationDelay: cue(tl.flipAt(i)) }}>
                  <CardFace side={side} className="av-flip-face w-full" />
                  <div className="av-flip-back">
                    <CardBack className="w-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-4 flex h-14 items-center justify-center" aria-live="polite">
          <div
            className={`av-stamp inline-flex items-center gap-2 rounded-xl border-[3px] border-double bg-black/40 px-4 py-1.5 ${tone}`}
            style={{ animationDelay: cue(tl.stampAt) }}
            data-stamp={success ? 'success' : 'fail'}
          >
            <AvIcon name={success ? 'quest-success' : 'quest-fail'} size={26} />
            <span className="av-display text-2xl uppercase tracking-wider">{success ? 'Thành công' : 'Thất bại'}</span>
          </div>
          <span className="sr-only">{stage !== 'reveal' ? (success ? 'Quest thành công' : 'Quest thất bại') : ''}</span>
        </div>

        {/* The totals, under the stamp: icon and number, no boxes. */}
        <p
          className="av-appear relative mt-3 flex justify-center gap-6 text-sm font-semibold text-(--av-text)"
          style={{ animationDelay: cue(tl.stampAt + 200) }}
          data-quest-totals={`${goodCount}/${evilCount}`}
        >
          <span className="inline-flex items-center gap-1.5" title="Lá Phe Người">
            <AvIcon name="quest-success" size={18} className="text-(--av-good-light)" />
            {goodCount} Phe Người
          </span>
          <span className="inline-flex items-center gap-1.5" title="Lá Phe Quỷ">
            <AvIcon name="quest-fail" size={18} className="text-(--av-evil-light)" />
            {evilCount} Phe Quỷ
          </span>
        </p>
      </GlassPanel>
    </div>
  );
}
