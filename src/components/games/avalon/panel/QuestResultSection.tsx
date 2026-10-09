import type { CSSProperties } from 'react';
import type { AvalonGameState } from '../types';
import { questNeedsTwoFails } from '../constants';
import { useCue } from '../hooks/useCue';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { questResultTimeline, questRevealOrder } from '../table/timelines';
import AvIcon from '../assets/AvIcon';
import GlassPanel from '../ui/GlassPanel';
import { CardBack, CardFace } from '../ui/QuestCard';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

// quest-result (8 s): 0–0.8 s the face-down cards are shuffled and dealt into
// a row, then turned over one by one (0.6 s apart), and 0.4 s after the last
// one the SUCCESS / FAILED stamp lands — the quest's tile on the table seals at
// the same moment (RoundTable). The row is rebuilt from the COUNTS only
// (failCount) and shuffled with phaseStartedAt as the seed: nobody's card is
// ever shown as theirs (ux-plan 2.4). Public result, so the team colours are
// fine here — but they only appear as the cards turn.
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
  const tone = success ? 'text-(--av-good-light)' : 'text-(--av-evil-light)';

  return (
    <div className="space-y-3" data-anim-stage={stage}>
      <GlassPanel tone="gold" emphasis className="relative overflow-hidden p-5 text-center sm:p-6">
        {/* The result's colour washes in with the stamp. */}
        <div
          className={`av-appear pointer-events-none absolute inset-0 rounded-[inherit] border-2 bg-linear-to-b to-transparent to-70% ${
            success ? 'border-(--av-good)/55 from-(--av-good)/18' : 'border-(--av-evil)/55 from-(--av-evil)/18'
          }`}
          style={{ animationDelay: cue(tl.stampAt) }}
        />

        <div className="av-rise relative" style={{ animationDelay: cue(0) }}>
          <p className="text-[11px] uppercase font-bold text-slate-300 tracking-widest">
            Quest {ROMAN[state.currentQuest] ?? state.currentQuest + 1} · Đội {quest.teamSize} người
          </p>
          <p className="av-display mt-1 text-3xl text-white">Lật bài</p>
          {needsTwo && (
            <p className="mt-1 text-[11px] font-bold text-(--av-evil-light)">
              <AvIcon name="warning" /> Quest này cần ≥ 2 lá Phe Quỷ mới thất bại
            </p>
          )}
        </div>

        {/* The row of cards: dealt from one pile, then turned over in order. */}
        <div className="relative mt-5 flex justify-center gap-2 [--card-gap:0.5rem] [--card-w:2.75rem] sm:[--card-w:3.5rem]" data-reveal-order={order.join(',')}>
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

        <div className="relative mt-5 flex h-14 items-center justify-center" aria-live="polite">
          <div
            className={`av-stamp inline-flex items-center gap-2 rounded-lg border-[3px] border-double bg-black/40 px-4 py-1.5 ${tone} ${
              success ? 'border-(--av-good-light)' : 'border-(--av-evil-light)'
            }`}
            style={{ animationDelay: cue(tl.stampAt) }}
            data-stamp={success ? 'success' : 'fail'}
          >
            <AvIcon name={success ? 'quest-success' : 'quest-fail'} size={26} />
            <span className="av-display text-2xl uppercase tracking-wider">{success ? 'Thành công' : 'Thất bại'}</span>
          </div>
          <span className="sr-only">{stage !== 'reveal' ? (success ? 'Quest thành công' : 'Quest thất bại') : ''}</span>
        </div>
      </GlassPanel>

      <GlassPanel className="av-appear p-5" style={{ animationDelay: cue(tl.stampAt + 200) }}>
        <p className="text-[11px] uppercase font-bold text-slate-400 mb-3 text-center">
          Tổng lựa chọn
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-(--av-good)/35 bg-(--av-good)/10 p-4 text-center">
            <AvIcon name="quest-success" size={30} className="mb-1 text-(--av-good-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-good-light) mb-0.5">Lá Phe Người</p>
            <p className="text-3xl font-black text-white">{goodCount}</p>
          </div>
          <div className="rounded-xl border-2 border-(--av-evil)/35 bg-(--av-evil)/10 p-4 text-center">
            <AvIcon name="quest-fail" size={30} className="mb-1 text-(--av-evil-light)" />
            <p className="text-[10px] uppercase font-bold text-(--av-evil-light) mb-0.5">Lá Phe Quỷ</p>
            <p className="text-3xl font-black text-white">{evilCount}</p>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
