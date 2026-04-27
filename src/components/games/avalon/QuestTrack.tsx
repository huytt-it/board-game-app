'use client';

import type { AvalonQuestRecord } from './types';
import { questNeedsTwoFails } from './constants';

interface QuestTrackProps {
  quests: AvalonQuestRecord[];
  currentQuest: number;
  playerCount: number;
  compact?: boolean;
}

export default function QuestTrack({ quests, currentQuest, playerCount, compact }: QuestTrackProps) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="absolute left-0 right-0 top-1/2 mx-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative flex items-stretch justify-between gap-1.5">
        {quests.map((q, idx) => {
          const isCurrent = idx === currentQuest;
          const isDone = q.result !== null;
          const success = q.result === 'success';
          const fail = q.result === 'fail';
          const needsTwo = questNeedsTwoFails(playerCount, idx);

          const ringColor = success
            ? 'border-blue-500/70 bg-blue-500/15 shadow-blue-500/30'
            : fail
            ? 'border-red-500/70 bg-red-500/15 shadow-red-500/30'
            : isCurrent
            ? 'border-amber-400/80 bg-amber-500/10 shadow-amber-500/30 ring-2 ring-amber-400/50'
            : 'border-white/15 bg-white/5';

          const numberColor = success
            ? 'text-blue-300'
            : fail
            ? 'text-red-300'
            : isCurrent
            ? 'text-amber-200'
            : 'text-slate-400';

          return (
            <div
              key={idx}
              className={`flex flex-1 flex-col items-center justify-center rounded-2xl border transition-all ${ringColor} ${
                compact ? 'p-1.5' : 'p-2'
              }`}
            >
              <div className={`text-[9px] font-black uppercase tracking-widest ${numberColor}`}>
                {`Q${idx + 1}`}
              </div>
              <div className={`font-black ${compact ? 'text-base' : 'text-xl'} ${
                isDone ? 'text-white' : numberColor
              }`}>
                {success ? '✓' : fail ? '✕' : q.teamSize}
              </div>
              {!isDone && (
                <div className={`text-[8px] uppercase tracking-wider ${
                  isCurrent ? 'text-amber-400/80' : 'text-slate-600'
                }`}>
                  {compact ? '' : 'người'}
                </div>
              )}
              {!isDone && needsTwo && (
                <div className="mt-0.5 rounded-full bg-rose-500/20 px-1.5 py-px text-[8px] font-black text-rose-300">
                  2✕
                </div>
              )}
              {isDone && (
                <div className={`text-[9px] font-bold ${
                  success ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {q.failCount > 0 ? `${q.failCount} fail` : 'sạch'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
