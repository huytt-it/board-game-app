'use client';

import { useState } from 'react';
import { useNightActions } from '@/hooks/useNightActions';
import { useVoting } from '@/hooks/games/useVoting';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';
import type { RoomGameState } from '@/types/room';
import { ROLE_ICONS, type ClocktowerRole } from '@/types/games/clocktower';
import VotingPanel from './VotingPanel';

interface HostDashboardProps {
  roomId: string;
  hostId: string;
  players: Player[];
  onChangePhase: (phase: 'day' | 'night') => void;
  currentPhase: string;
  gameState?: RoomGameState;
  onEndGame?: (winner: 'good' | 'evil') => void;
}

export default function HostDashboard({
  roomId,
  hostId,
  players,
  onChangePhase,
  currentPhase,
  gameState,
  onEndGame,
}: HostDashboardProps) {
  const { pendingActions, resolvedActions, resolveAction, sendPrivateMessage, clearAllActions } = useNightActions(roomId, hostId);
  const [resolveMessages, setResolveMessages] = useState<Record<string, string>>({});
  const [directMessage, setDirectMessage] = useState('');
  const [directTarget, setDirectTarget] = useState('');

  const alivePlayers = players.filter((p) => !p.isHost && p.isAlive).length;
  const { nominations, votingTarget, votingTargetName, votes, hasVoted, voteCount, nominatePlayer, castVote, resolveVote, cancelVote } =
    useVoting(roomId, hostId, gameState, alivePlayers);

  const toggleAlive = async (playerId: string, currentAlive: boolean) => {
    await gameStorage.updatePlayerAlive(roomId, playerId, !currentAlive);
  };

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

      {/* Voting Section (Day Phase) */}
      {(currentPhase === 'day' || currentPhase === 'voting') && (
        <div className="space-y-4">
          {/* Active voting */}
          {currentPhase === 'voting' && votingTarget && votingTargetName && (
            <VotingPanel
              targetName={votingTargetName}
              targetId={votingTarget}
              players={players}
              playerId={hostId}
              votes={votes}
              hasVoted={hasVoted}
              voteCount={voteCount}
              onVote={(v) => castVote(v)}
              onResolve={resolveVote}
              onCancel={cancelVote}
              isHost={true}
              alivePlayers={alivePlayers}
            />
          )}

          {/* Live Nominations (only during day, not during active voting) */}
          {currentPhase === 'day' && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                ⚖️ Live Nominations
              </h3>
              <div className="space-y-2">
                {players
                  .filter((p) => !p.isHost && p.isAlive)
                  .sort((a, b) => {
                     const aCount = Object.values(nominations || {}).filter(id => id === a.id).length;
                     const bCount = Object.values(nominations || {}).filter(id => id === b.id).length;
                     return bCount - aCount;
                  })
                  .map((p) => {
                    const role = p.gameData?.role as ClocktowerRole | undefined;
                    const count = Object.values(nominations || {}).filter(id => id === p.id).length;
                    const percentage = alivePlayers > 0 ? Math.round((count / alivePlayers) * 100) : 0;
                    
                    if (count === 0) return null;

                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                         <div className="flex-1">
                           <div className="flex items-center justify-between mb-1">
                             <div className="flex items-center gap-2 text-sm text-white font-medium">
                               {role && <span>{ROLE_ICONS[role]}</span>}
                               {p.name}
                             </div>
                             <span className="text-xs text-amber-400 font-bold">{count} votes ({percentage}%)</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                             <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
                           </div>
                         </div>
                         <button
                           onClick={() => nominatePlayer(p.id, p.name)}
                           className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-amber-500 shadow-lg shadow-amber-500/20"
                         >
                           ⚖️ Trial
                         </button>
                      </div>
                    );
                  })}
                  
                  {Object.values(nominations || {}).length === 0 && (
                     <p className="text-sm text-slate-500 italic text-center py-4">No one has been nominated yet.</p>
                  )}
              </div>
            </div>
          )}
        </div>
      )}

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
          {players.map((p) => {
            const role = p.gameData?.role as ClocktowerRole | undefined;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  p.isAlive ? 'bg-white/5 text-white' : 'bg-red-500/5 text-slate-500 line-through'
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${p.isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
                {role && <span>{ROLE_ICONS[role]}</span>}
                <span>{p.name}</span>
                {p.isHost && <span className="ml-auto text-xs text-amber-400">Host</span>}
                {role && !p.isHost && (
                  <span className="ml-auto text-xs text-purple-400">{String(role)}</span>
                )}
                {!p.isHost && (
                  <button
                    onClick={() => toggleAlive(p.id, p.isAlive)}
                    className={`ml-auto rounded-md px-2 py-1 text-xs font-bold transition-all ${
                      p.isAlive 
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {p.isAlive ? '💀 Kill' : '💖 Revive'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* End Game Control */}
      {onEndGame && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            End Game
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (confirm('Are you sure the Good team has won?')) {
                  onEndGame('good');
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-bold text-white transition-all hover:from-cyan-500 hover:to-blue-500"
            >
              🌟 Good Wins
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure the Evil team has won?')) {
                  onEndGame('evil');
                }
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
            >
              👹 Evil Wins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
