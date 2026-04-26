'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import {
  ROLE_ICONS,
  ROLE_SHORT_DESC,
  ROLE_NIGHT_INSTRUCTIONS,
  type ClocktowerRole,
} from '@/types/games/clocktower';

interface SingleTargetActionProps {
  role: ClocktowerRole;
  playerId: string;
  players: Player[];
  canTargetSelf?: boolean; // Imp can self-target (starpass)
  onSubmit: (targetId: string, targetName: string) => void;
}

export default function SingleTargetAction({
  role,
  playerId,
  players,
  canTargetSelf = false,
  onSubmit,
}: SingleTargetActionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const candidates = players.filter((p) => {
    if (p.isHost) return false;
    if (!p.isAlive) return false;
    if (!canTargetSelf && p.id === playerId) return false;
    return true;
  });

  const instruction = ROLE_NIGHT_INSTRUCTIONS[role];
  const selectedPlayer = candidates.find((p) => p.id === selected);

  const handleSubmit = () => {
    if (!selectedPlayer) return;
    onSubmit(selectedPlayer.id, selectedPlayer.name);
  };

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Role header */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-900/10 p-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl shrink-0">{ROLE_ICONS[role]}</span>
          <div className="min-w-0">
            <h3 className="font-black text-white text-base">{role}</h3>
            <p className="text-xs text-purple-300 leading-snug">{ROLE_SHORT_DESC[role]}</p>
          </div>
        </div>
        {instruction && (
          <div className="mt-3 rounded-xl bg-black/30 border border-white/5 px-4 py-3">
            <p className="text-sm text-slate-200 leading-relaxed">{instruction}</p>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-sm font-bold text-slate-300 px-1">Chọn 1 người chơi:</p>

      {/* Player grid — 2 cols, large touch targets */}
      <div className="grid grid-cols-2 gap-3">
        {candidates.map((player) => {
          const isSelf = player.id === playerId;
          const isSelected = selected === player.id;
          return (
            <button
              key={player.id}
              onClick={() => setSelected(isSelected ? null : player.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95 min-h-[96px] ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/60 shadow-lg shadow-purple-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-black text-white shrink-0 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/40'
                    : 'bg-gradient-to-br from-purple-500 to-cyan-500'
                }`}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <span className={`text-sm font-semibold leading-tight ${
                isSelected ? 'text-purple-200' : 'text-white'
              }`}>
                {player.name}
              </span>

              {/* Tags */}
              {isSelf && (
                <span className="text-[10px] text-cyan-400 font-bold">Bản thân</span>
              )}
              {isSelected && (
                <span className="text-[10px] text-purple-300 font-bold">✓ Đã chọn</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sticky confirm button */}
      <div className="sticky bottom-0 pb-safe pt-2">
        <div className="bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-3">
          <button
            onClick={handleSubmit}
            disabled={!selected}
            className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-4 text-base font-black text-white transition-all active:scale-[0.98] hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            {selectedPlayer
              ? `✓ Xác nhận — ${selectedPlayer.name}`
              : 'Chọn 1 người chơi'}
          </button>
        </div>
      </div>
    </div>
  );
}
