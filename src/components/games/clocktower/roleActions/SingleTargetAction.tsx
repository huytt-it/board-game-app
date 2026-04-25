'use client';

import { useState } from 'react';
import type { Player } from '@/types/player';
import { ROLE_ICONS, ROLE_SHORT_DESC, ROLE_NIGHT_INSTRUCTIONS, type ClocktowerRole } from '@/types/games/clocktower';

interface SingleTargetActionProps {
  role: ClocktowerRole;
  playerId: string;
  players: Player[];
  canTargetSelf?: boolean; // Imp can self-target to starpass
  onSubmit: (targetId: string, targetName: string) => void;
}

/**
 * UI for roles that pick exactly one target:
 * Monk, Poisoner, Imp, Butler, Ravenkeeper
 */
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

  const handleSubmit = () => {
    const target = candidates.find((p) => p.id === selected);
    if (!target) return;
    onSubmit(target.id, target.name);
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Role info */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{ROLE_ICONS[role]}</span>
          <div>
            <h3 className="font-bold text-white">{role}</h3>
            <p className="text-xs text-purple-300">{ROLE_SHORT_DESC[role]}</p>
          </div>
        </div>
        {instruction && (
          <div className="rounded-lg bg-black/20 border border-white/5 p-3 mt-2">
            <p className="text-xs text-slate-300 leading-relaxed">{instruction}</p>
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-300 px-1">Chọn 1 người chơi:</p>

      {/* Target grid */}
      <div className="grid grid-cols-2 gap-2">
        {candidates.map((player) => {
          const isSelf = player.id === playerId;
          return (
            <button
              key={player.id}
              onClick={() => setSelected(player.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                selected === player.id
                  ? 'border-purple-500 bg-purple-500/10 text-white ring-1 ring-purple-500'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white shrink-0">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{player.name}</p>
                  {isSelf && <p className="text-[10px] text-cyan-400">Bản thân</p>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Xác nhận lựa chọn
      </button>
    </div>
  );
}
