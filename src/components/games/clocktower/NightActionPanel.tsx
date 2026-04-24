'use client';

import { useState } from 'react';
import { useClocktowerNight } from '@/hooks/games/useClocktowerNight';
import type { Player } from '@/types/player';
import {
  ROLE_ICONS,
  ROLE_ABILITIES,
  ROLE_SHORT_DESC,
  type ClocktowerRole,
} from '@/types/games/clocktower';
import PlayerWaiting from './PlayerWaiting';

interface NightActionPanelProps {
  roomId: string;
  playerId: string;
  players: Player[];
  roleName?: string;
  dayCount: number;
}

export default function NightActionPanel({ roomId, playerId, players, roleName, dayCount }: NightActionPanelProps) {
  const { privateMessage, waitingForStoryteller, hasSubmitted, hasNightAction, submitAction, clearMessage } = useClocktowerNight(roomId, playerId, dayCount);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const currentPlayer = players.find((p) => p.id === playerId);
  const isAlive = currentPlayer?.isAlive ?? false;
  const role = roleName as ClocktowerRole | undefined;
  const otherPlayers = players.filter((p) => p.id !== playerId && p.isAlive && !p.isHost);

  // Dead player — show death message
  if (!isAlive) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center animate-scale-in">
        <div className="text-5xl mb-3">💀</div>
        <h3 className="text-lg font-bold text-red-400 mb-2">You Have Perished</h3>
        <p className="text-sm text-slate-400">
          The dead cannot act in the night. Rest now...
        </p>
      </div>
    );
  }

  // Role without night action — show waiting
  if (role && !hasNightAction) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/10 p-5 text-center">
          <div className="text-4xl mb-3">{role ? ROLE_ICONS[role] : '🌙'}</div>
          <h3 className="text-lg font-semibold text-indigo-300 mb-2">No Night Action</h3>
          <p className="text-sm text-slate-400">
            Your role ({role}) does not act during the night.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Wait for the Storyteller to advance to day...
          </p>
        </div>
        <PlayerWaiting message="Waiting for the night to pass..." />
      </div>
    );
  }

  // Show private message from Storyteller
  if (privateMessage) {
    return (
      <div className="space-y-4 animate-scale-in">
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
    <div className="space-y-4 animate-slide-up">
      {/* Role ability info */}
      {role && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{ROLE_ICONS[role]}</span>
            <div>
              <h3 className="font-bold text-white">{role}</h3>
              <p className="text-xs text-purple-300">{ROLE_SHORT_DESC[role]}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{ROLE_ABILITIES[role]}</p>
        </div>
      )}

      <div className="rounded-xl bg-white/5 p-4">
        <h3 className="mb-1 font-semibold text-white">
          🌙 Night Action
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white">
                {player.name.charAt(0).toUpperCase()}
              </div>
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
