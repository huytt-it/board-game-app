'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { ROLE_ICONS, ROLE_SHORT_DESC, ROLE_NIGHT_INSTRUCTIONS, type ClocktowerRole } from '@/types/games/clocktower';

interface DualTargetActionProps {
  role: ClocktowerRole;
  playerId: string;
  players: Player[];
  onSubmit: (firstId: string, firstName: string, secondId: string, secondName: string) => void;
}

/**
 * UI for Fortune Teller: pick exactly 2 different players.
 * First click = first pick (highlighted in purple).
 * Second click on a different player = second pick (highlighted in cyan).
 */
export default function DualTargetAction({ role, playerId, players, onSubmit }: DualTargetActionProps) {
  const [firstTarget, setFirstTarget] = useState<string | null>(null);
  const [secondTarget, setSecondTarget] = useState<string | null>(null);

  const candidates = players.filter((p) => !p.isHost && p.isAlive);

  const instruction = ROLE_NIGHT_INSTRUCTIONS[role];

  const handleSelect = (id: string) => {
    if (id === firstTarget) {
      setFirstTarget(null);
      return;
    }
    if (id === secondTarget) {
      setSecondTarget(null);
      return;
    }
    if (!firstTarget) {
      setFirstTarget(id);
    } else if (!secondTarget) {
      setSecondTarget(id);
    } else {
      // Both slots full — replace the first slot, shift second to first
      setFirstTarget(secondTarget);
      setSecondTarget(id);
    }
  };

  const handleSubmit = () => {
    const first = candidates.find((p) => p.id === firstTarget);
    const second = candidates.find((p) => p.id === secondTarget);
    if (!first || !second) return;
    onSubmit(first.id, first.name, second.id, second.name);
  };

  const getSelectionLabel = (id: string) => {
    if (id === firstTarget) return '1';
    if (id === secondTarget) return '2';
    return null;
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Role info */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-900/10 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{ROLE_ICONS[role]}</span>
          <div>
            <h3 className="font-bold text-white">{role}</h3>
            <p className="text-xs text-indigo-300">{ROLE_SHORT_DESC[role]}</p>
          </div>
        </div>
        {instruction && (
          <div className="rounded-lg bg-black/20 border border-white/5 p-3 mt-2">
            <p className="text-xs text-slate-300 leading-relaxed">{instruction}</p>
          </div>
        )}
      </div>

      {/* Selection indicators */}
      <div className="flex gap-3">
        <div className={`flex-1 rounded-lg border p-2 text-center text-xs transition-all ${
          firstTarget
            ? 'border-purple-500 bg-purple-500/10 text-purple-300'
            : 'border-white/10 bg-white/5 text-slate-500'
        }`}>
          <span className="font-bold">Người 1:</span>{' '}
          {firstTarget ? candidates.find((p) => p.id === firstTarget)?.name : '—'}
        </div>
        <div className={`flex-1 rounded-lg border p-2 text-center text-xs transition-all ${
          secondTarget
            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
            : 'border-white/10 bg-white/5 text-slate-500'
        }`}>
          <span className="font-bold">Người 2:</span>{' '}
          {secondTarget ? candidates.find((p) => p.id === secondTarget)?.name : '—'}
        </div>
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((player) => {
          const label = getSelectionLabel(player.id);
          const isFirst = player.id === firstTarget;
          const isSecond = player.id === secondTarget;
          return (
            <button
              key={player.id}
              onClick={() => handleSelect(player.id)}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isFirst
                  ? 'border-purple-500 bg-purple-500/10 text-white ring-1 ring-purple-500'
                  : isSecond
                  ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {label && (
                <div className={`absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                  isFirst ? 'bg-purple-500' : 'bg-cyan-500'
                }`}>
                  {label}
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 ${
                  isFirst
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                    : isSecond
                    ? 'bg-gradient-to-br from-cyan-500 to-cyan-700'
                    : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium truncate">{player.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!firstTarget || !secondTarget}
        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 font-semibold text-white transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {firstTarget && secondTarget
          ? `🔮 Hỏi về ${candidates.find((p) => p.id === firstTarget)?.name} & ${candidates.find((p) => p.id === secondTarget)?.name}`
          : 'Chọn 2 người chơi'}
      </button>
    </div>
  );
}
