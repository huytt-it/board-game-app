'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import {
  ROLE_ICONS,
  ROLE_SHORT_DESC,
  ROLE_NIGHT_INSTRUCTIONS,
  type ClocktowerRole,
} from '@/types/games/clocktower';

interface DualTargetActionProps {
  role: ClocktowerRole;
  playerId: string;
  players: Player[];
  onSubmit: (
    firstId: string,
    firstName: string,
    secondId: string,
    secondName: string
  ) => void;
}

/**
 * Fortune Teller: pick exactly 2 different players.
 * First tap → purple slot #1. Second tap → cyan slot #2.
 */
export default function DualTargetAction({
  role,
  playerId,
  players,
  onSubmit,
}: DualTargetActionProps) {
  const [firstTarget, setFirstTarget] = useState<string | null>(null);
  const [secondTarget, setSecondTarget] = useState<string | null>(null);

  const candidates = players.filter((p) => !p.isHost && p.isAlive);
  const instruction = ROLE_NIGHT_INSTRUCTIONS[role];

  const handleSelect = (id: string) => {
    if (id === firstTarget) { setFirstTarget(null); return; }
    if (id === secondTarget) { setSecondTarget(null); return; }
    if (!firstTarget) { setFirstTarget(id); return; }
    if (!secondTarget) { setSecondTarget(id); return; }
    // Both full — shift: second → first, new → second
    setFirstTarget(secondTarget);
    setSecondTarget(id);
  };

  const handleSubmit = () => {
    const first = candidates.find((p) => p.id === firstTarget);
    const second = candidates.find((p) => p.id === secondTarget);
    if (!first || !second) return;
    onSubmit(first.id, first.name, second.id, second.name);
  };

  const firstPlayer  = candidates.find((p) => p.id === firstTarget);
  const secondPlayer = candidates.find((p) => p.id === secondTarget);
  const ready = !!firstTarget && !!secondTarget;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Role header */}
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/10 p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl shrink-0">{ROLE_ICONS[role]}</span>
          <div className="min-w-0">
            <h3 className="font-black text-white text-base">{role}</h3>
            <p className="text-xs text-indigo-300 leading-snug">{ROLE_SHORT_DESC[role]}</p>
          </div>
        </div>
        {instruction && (
          <div className="mt-3 rounded-xl bg-black/30 border border-white/5 px-4 py-3">
            <p className="text-sm text-slate-200 leading-relaxed">{instruction}</p>
          </div>
        )}
      </div>

      {/* Selection slots */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-all ${
          firstPlayer
            ? 'border-purple-500/60 bg-purple-500/10'
            : 'border-white/10 bg-white/5'
        }`}>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            firstPlayer ? 'bg-purple-500 text-white' : 'bg-white/10 text-slate-500'
          }`}>
            1
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Người thứ nhất</p>
            <p className={`text-sm font-bold truncate ${firstPlayer ? 'text-purple-200' : 'text-slate-600'}`}>
              {firstPlayer?.name ?? '—'}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-all ${
          secondPlayer
            ? 'border-cyan-500/60 bg-cyan-500/10'
            : 'border-white/10 bg-white/5'
        }`}>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
            secondPlayer ? 'bg-cyan-500 text-white' : 'bg-white/10 text-slate-500'
          }`}>
            2
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Người thứ hai</p>
            <p className={`text-sm font-bold truncate ${secondPlayer ? 'text-cyan-200' : 'text-slate-600'}`}>
              {secondPlayer?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Helper hint */}
      <p className="text-center text-xs text-slate-500">
        Nhấn để chọn · Nhấn lại để bỏ chọn
      </p>

      {/* Player grid */}
      <div className="grid grid-cols-2 gap-3">
        {candidates.map((player) => {
          const isFirst  = player.id === firstTarget;
          const isSecond = player.id === secondTarget;
          return (
            <button
              key={player.id}
              onClick={() => handleSelect(player.id)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95 min-h-[96px] ${
                isFirst
                  ? 'border-purple-500/60 bg-purple-500/15 ring-1 ring-purple-500/50 shadow-lg shadow-purple-500/15'
                  : isSecond
                  ? 'border-cyan-500/60 bg-cyan-500/15 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-500/15'
                  : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              {/* Slot badge */}
              {(isFirst || isSecond) && (
                <div className={`absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white shadow-md ${
                  isFirst ? 'bg-purple-500' : 'bg-cyan-500'
                }`}>
                  {isFirst ? '1' : '2'}
                </div>
              )}

              {/* Avatar */}
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-black text-white shrink-0 transition-all ${
                isFirst
                  ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/40'
                  : isSecond
                  ? 'bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-lg shadow-cyan-500/40'
                  : 'bg-gradient-to-br from-purple-500 to-cyan-500'
              }`}>
                {player.name.charAt(0).toUpperCase()}
              </div>

              <span className={`text-sm font-semibold leading-tight ${
                isFirst ? 'text-purple-200' : isSecond ? 'text-cyan-200' : 'text-white'
              }`}>
                {player.name}
              </span>

              {player.id === playerId && (
                <span className="text-[10px] text-slate-500">Bạn</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky confirm */}
      <div className="sticky bottom-0 pb-safe pt-2">
        <div className="bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-3">
          <button
            onClick={handleSubmit}
            disabled={!ready}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-base font-black text-white transition-all active:scale-[0.98] hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {ready
              ? `🔮 Hỏi về ${firstPlayer?.name} & ${secondPlayer?.name}`
              : 'Chọn 2 người chơi'}
          </button>
        </div>
      </div>
    </div>
  );
}
