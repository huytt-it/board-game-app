'use client';

import { useState } from 'react';
import { useClocktowerNight } from '@/hooks/games/useClocktowerNight';
import type { Player } from '@/types/player';
import PlayerWaiting from './PlayerWaiting';

interface NightActionPanelProps {
  roomId: string;
  playerId: string;
  players: Player[];
  roleName?: string;
}

export default function NightActionPanel({ roomId, playerId, players, roleName }: NightActionPanelProps) {
  const { privateMessage, waitingForStoryteller, hasSubmitted, submitAction, clearMessage } = useClocktowerNight(roomId, playerId);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const otherPlayers = players.filter((p) => p.id !== playerId && p.isAlive);

  // Show private message from Storyteller
  if (privateMessage) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="font-semibold text-purple-300">Message from the Storyteller</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-200">{privateMessage}</p>
        </div>
        <button
          onClick={clearMessage}
          className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-400 transition-all hover:bg-white/10 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Show waiting state
  if (waitingForStoryteller || hasSubmitted) {
    return <PlayerWaiting message="Waiting for the Storyteller's response..." />;
  }

  // Show action selection
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4">
        <h3 className="mb-1 font-semibold text-white">
          🌙 Night Action {roleName && <span className="text-purple-400">({roleName})</span>}
        </h3>
        <p className="text-sm text-slate-400">Select a player to use your ability on:</p>
      </div>

      {/* Target selection */}
      <div className="grid grid-cols-2 gap-2">
        {otherPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedTarget(player.id)}
            className={`rounded-xl border p-3 text-left transition-all ${
              selectedTarget === player.id
                ? 'border-purple-500 bg-purple-500/10 text-white ring-1 ring-purple-500'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
            }`}
            id={`target-${player.id}`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${player.isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">{player.name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Submit button */}
      <button
        onClick={() => {
          if (!selectedTarget) return;
          const target = otherPlayers.find((p) => p.id === selectedTarget);
          if (target) submitAction(selectedTarget, target.name);
        }}
        disabled={!selectedTarget}
        className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
        id="submit-night-action-btn"
      >
        Submit Night Action
      </button>
    </div>
  );
}
