'use client';

import { useState } from 'react';
import { useNightActions } from '@/hooks/useNightActions';
import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';

interface HostDashboardProps {
  roomId: string;
  hostId: string;
  players: Player[];
  onChangePhase: (phase: 'day' | 'night') => void;
  currentPhase: string;
}

export default function HostDashboard({ roomId, hostId, players, onChangePhase, currentPhase }: HostDashboardProps) {
  const { pendingActions, resolvedActions, resolveAction, sendPrivateMessage, clearAllActions } = useNightActions(roomId, hostId);
  const [resolveMessages, setResolveMessages] = useState<Record<string, string>>({});
  const [directMessage, setDirectMessage] = useState('');
  const [directTarget, setDirectTarget] = useState('');

  const handleResolve = async (action: GameAction) => {
    const msg = resolveMessages[action.id] || 'No information.';
    await resolveAction(action.id, msg);
    // Also push private message to the player
    await sendPrivateMessage(action.playerId, msg);
    setResolveMessages((prev) => {
      const copy = { ...prev };
      delete copy[action.id];
      return copy;
    });
  };

  const handleDirectMessage = async () => {
    if (!directTarget || !directMessage.trim()) return;
    await sendPrivateMessage(directTarget, directMessage.trim());
    setDirectMessage('');
    setDirectTarget('');
  };

  const handleNewNight = async () => {
    await clearAllActions();
    onChangePhase('night');
  };

  return (
    <div className="space-y-6">
      {/* Phase Controls */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Phase Control</h3>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onChangePhase('day')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'day'
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
            }`}
            id="phase-day-btn"
          >
            ☀️ Day
          </button>
          <button
            onClick={handleNewNight}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'night'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300'
            }`}
            id="phase-night-btn"
          >
            🌙 Night
          </button>
        </div>
      </div>

      {/* Pending Night Actions */}
      {currentPhase === 'night' && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
            </span>
            Pending Actions ({pendingActions.length})
          </h3>

          {pendingActions.length === 0 && (
            <p className="rounded-xl bg-white/5 px-4 py-8 text-center text-sm text-slate-500">
              Waiting for players to submit their night actions...
            </p>
          )}

          {pendingActions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-indigo-900/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-white">{action.playerName}</span>
                  <span className="mx-2 text-slate-500">→</span>
                  <span className="text-purple-300">{action.targetName || 'No target'}</span>
                </div>
                <span className="rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                  {action.actionType}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={resolveMessages[action.id] || ''}
                  onChange={(e) => setResolveMessages((prev) => ({ ...prev, [action.id]: e.target.value }))}
                  placeholder="Storyteller response..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleResolve(action)}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-purple-500"
                  id={`resolve-${action.id}`}
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}

          {/* Resolved Actions */}
          {resolvedActions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Resolved ({resolvedActions.length})
              </h4>
              {resolvedActions.map((action) => (
                <div key={action.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">{action.playerName}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-slate-400">{action.targetName}</span>
                  <span className="ml-auto text-xs text-slate-500">{action.result?.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Direct Private Message */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          📬 Send Private Message
        </h3>
        <div className="space-y-2">
          <select
            value={directTarget}
            onChange={(e) => setDirectTarget(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
            id="direct-message-target"
          >
            <option value="">Select player...</option>
            {players
              .filter((p) => p.id !== hostId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {!p.isAlive ? '(Dead)' : ''}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              placeholder="Type a private message..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500"
              id="direct-message-input"
            />
            <button
              onClick={handleDirectMessage}
              disabled={!directTarget || !directMessage.trim()}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-cyan-500 disabled:opacity-40"
              id="send-direct-message-btn"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Player Overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Players ({players.length})
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                p.isAlive ? 'bg-white/5 text-white' : 'bg-red-500/5 text-slate-500 line-through'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${p.isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{p.name}</span>
              {p.isHost && <span className="ml-auto text-xs text-amber-400">Host</span>}
              {p.gameData?.role && (
                <span className="ml-auto text-xs text-purple-400">{String(p.gameData.role)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
