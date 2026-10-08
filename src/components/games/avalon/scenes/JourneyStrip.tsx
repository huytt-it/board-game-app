import type { AvalonGameState } from '../types';
import AvIcon from '../assets/AvIcon';
import { getJourney } from './journey';
import SceneThumb from './SceneThumb';
import { SCENE_NAMES_VI } from './types';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

// The game's five legs in journey order, each a thumbnail of its location.
// A finished leg shows its result (public information: the team colour and
// the success / fail icon), the leg the knights head for next is marked in
// gold, later ones are dimmed. Shown during discussion; GĐ5 reuses it for the
// end-of-game summary.
export default function JourneyStrip({ state, roomId }: { state: AvalonGameState; roomId: string }) {
  const journey = getJourney(state, roomId);
  const next = journey[Math.min(Math.max(state.currentQuest, 0), 4)];

  return (
    <div>
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Hành trình 5 Quest">
        {journey.map((loc, i) => {
          const result = state.quests[i]?.result ?? null;
          const isNext = !result && i === state.currentQuest;
          const status = result === 'success' ? 'thành công' : result === 'fail' ? 'thất bại' : isNext ? 'chặng kế tiếp' : 'chưa tới';
          const frame =
            result === 'success'
              ? 'border-(--av-good)/80'
              : result === 'fail'
                ? 'border-(--av-evil)/80'
                : isNext
                  ? 'border-(--av-gold) shadow-[0_0_12px_rgba(212,166,74,0.45)]'
                  : 'border-white/10';
          return (
            <li
              key={i}
              data-journey-leg={loc}
              data-journey-status={result ?? (isNext ? 'next' : 'later')}
              className="flex min-w-0 flex-col items-center gap-1"
              aria-label={`Quest ${ROMAN[i]}: ${SCENE_NAMES_VI[loc]} — ${status}`}
              title={`Quest ${ROMAN[i]}: ${SCENE_NAMES_VI[loc]}`}
            >
              <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 ${frame}`}>
                <SceneThumb id={loc} className={result || isNext ? '' : 'opacity-40'} />
                {result && (
                  <span
                    className={`absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--av-ink) ${
                      result === 'success' ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
                    }`}
                  >
                    <AvIcon name={result === 'success' ? 'quest-success' : 'quest-fail'} size={13} />
                  </span>
                )}
              </div>
              <span className={`av-display text-sm leading-none ${isNext ? 'text-(--av-gold)' : 'text-slate-300'}`}>
                {ROMAN[i]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-[11px] text-slate-300">
        Chặng kế tiếp: <span className="font-bold text-(--av-parchment)">{SCENE_NAMES_VI[next]}</span>
      </p>
    </div>
  );
}
