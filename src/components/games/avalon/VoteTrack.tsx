'use client';

import { VOTE_TRACK_LIMIT } from './constants';

interface VoteTrackProps {
  rejectStreak: number;
}

export default function VoteTrack({ rejectStreak }: VoteTrackProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1">
        Từ chối
      </span>
      {Array.from({ length: VOTE_TRACK_LIMIT }).map((_, i) => {
        const filled = i < rejectStreak;
        const isLast = i === VOTE_TRACK_LIMIT - 1;
        return (
          <div
            key={i}
            className={`h-2.5 w-5 rounded-full border transition-all ${
              filled
                ? isLast
                  ? 'bg-red-500 border-red-400 shadow shadow-red-500/40'
                  : 'bg-amber-500 border-amber-400 shadow shadow-amber-500/30'
                : 'bg-white/5 border-white/15'
            }`}
          />
        );
      })}
      <span className={`text-[10px] font-black ml-1 ${
        rejectStreak >= 4 ? 'text-red-400' : rejectStreak >= 3 ? 'text-amber-400' : 'text-slate-500'
      }`}>
        {rejectStreak}/{VOTE_TRACK_LIMIT}
      </span>
    </div>
  );
}
